import type { Collector, Elb, EmitFn, ObserverFn } from '@walkeros/core';
import {
  OBSERVE_STORAGE_KEY,
  createBatchedPoster,
  createTelemetryObserver,
  parseObserveCredential,
} from '@walkeros/core';
import type { StartFlow } from './types';
import { collector } from './collector';
import { initSources } from './source';

// Structural slices of the browser globals the web-arm credential read
// touches. The collector runs platform-neutral, so window/URLSearchParams
// are read off globalThis behind guards -- the same pattern core's
// preview.ts activator uses. On a server runtime both lookups resolve to
// undefined and the web arm reads "absent" (zero work).
interface ObserveGlobals {
  window?: {
    location: { href: string; search: string };
    history: { replaceState(data: unknown, title: string, url: string): void };
    localStorage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
    };
  };
  URLSearchParams?: new (init: string) => {
    getAll(name: string): string[];
    delete(name: string): void;
    toString(): string;
  };
}

const G = globalThis as ObserveGlobals;

/**
 * Last `elbObserve` URL param value, or null. The param name and the
 * storage slot share the `elbObserve` key by design (the preview activator
 * ferries the former into the latter). Never throws.
 */
function readObserveParam(): string | null {
  const win = G.window;
  const USP = G.URLSearchParams;
  if (!win || !USP) return null;
  try {
    const search = new USP(win.location.search.replace(/^\?/, ''));
    const values = search.getAll(OBSERVE_STORAGE_KEY);
    return values.length > 0 ? (values[values.length - 1] ?? null) : null;
  } catch {
    return null;
  }
}

/** Stored `elbObserve` slot, or null. Never throws (Safari private mode). */
function readObserveSlot(): string | null {
  try {
    return G.window?.localStorage.getItem(OBSERVE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeObserveSlot(value: string): void {
  try {
    G.window?.localStorage.setItem(OBSERVE_STORAGE_KEY, value);
  } catch {
    // Slot persistence is best-effort; the session still attaches this page.
  }
}

/**
 * CAS-style slot clear: remove the slot only when it still holds exactly
 * `expected`, so a credential re-minted by another tab (or a later
 * activation) is never destroyed by a stale poster's self-heal.
 */
function clearObserveSlotIf(expected: string): void {
  try {
    const win = G.window;
    if (!win) return;
    if (win.localStorage.getItem(OBSERVE_STORAGE_KEY) === expected) {
      win.localStorage.removeItem(OBSERVE_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: nothing to heal.
  }
}

/**
 * Remove the `elbObserve` param from the address bar after it has been
 * persisted to the slot, keeping every other param and the hash intact.
 * Same history.replaceState mechanics as core preview.ts's stripParam, but
 * scoped to the one param this wiring owns.
 */
function stripObserveParam(): void {
  const win = G.window;
  const USP = G.URLSearchParams;
  if (!win || !USP) return;
  try {
    const href = win.location.href;
    const hashIdx = href.indexOf('#');
    const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';
    const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    const qIdx = withoutHash.indexOf('?');
    const path = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
    const params = new USP(qIdx >= 0 ? withoutHash.slice(qIdx + 1) : '');
    params.delete(OBSERVE_STORAGE_KEY);
    const query = params.toString();
    win.history.replaceState(
      {},
      '',
      `${path}${query ? `?${query}` : ''}${hash}`,
    );
  } catch {
    // A page that forbids history writes still attaches; the param stays.
  }
}

/**
 * Stamp the runtime's release provenance onto every posted record. Like
 * `flowId`, `release` is baked by the wiring layer so emitting sites never
 * see it. Identity when the runtime has no release id.
 */
function withRelease(post: EmitFn, release: string | undefined): EmitFn {
  if (release === undefined) return post;
  return (state) => post({ ...state, release });
}

/**
 * Override the record's flowId on every posted record. The emit sites stamp
 * `collector.name`; a baked connect config (e.g. a preview artifact) may
 * carry the platform's flow id instead, so the posting layer rewrites it
 * without the emit sites ever knowing. Identity when no override is baked.
 */
function withFlowId(post: EmitFn, flowId: string | undefined): EmitFn {
  if (flowId === undefined) return post;
  return (state) => post({ ...state, flowId });
}

/**
 * Install the advisory observation channel configured on `initConfig`:
 * caller-supplied `observers` land in the advisory Set verbatim, and an
 * `observe` connect config attaches a telemetry poster for its arm. Runs
 * after the collector instance exists and before `command('run')`, so
 * run-phase records are captured. Everything installed here is advisory:
 * observers run inside `emitStep`'s try/catch and the poster swallows
 * transport errors, so nothing on this path can break event processing.
 */
function installObserve(
  instance: Collector.Instance,
  initConfig: Collector.InitConfig,
): void {
  if (initConfig.observers) {
    for (const observer of initConfig.observers) {
      instance.observers.add(observer);
    }
  }

  const observe = initConfig.observe;
  if (!observe) return;

  const flowId = instance.name ?? 'default';

  if ('binding' in observe) {
    // Web arm: the credential arrives out-of-band via the elbObserve URL
    // param (or the storage slot the preview activator ferries it into).
    // Truly absent means zero work: no parse, no storage write, no observer.
    const param = readObserveParam();
    const raw = param ?? readObserveSlot();
    if (!raw) return;

    // A present-but-broken credential is warned, never silently dropped;
    // only the truly-absent case above is silent (zero-work contract).
    const credential = parseObserveCredential(raw);
    if (!credential) {
      if (param === null) {
        // Slot-sourced garbage: stored state clears on its own failure, so
        // self-heal instead of warning on every pageview.
        instance.logger.warn('observe: malformed stored credential cleared');
        clearObserveSlotIf(raw);
      } else {
        // URL-sourced garbage never touches stored state (anti-griefing).
        instance.logger.warn('observe: malformed credential ignored');
      }
      return;
    }
    if (credential.pb !== observe.binding) {
      instance.logger.warn(
        'observe: credential binding mismatch, credential ignored',
      );
      return;
    }

    writeObserveSlot(raw);
    // The credential is persisted; a URL-borne copy is now redundant and,
    // being a bearer credential, must not linger in the address bar.
    if (param !== null) stripObserveParam();

    let observer: ObserverFn | undefined;
    const post = createBatchedPoster({
      url: `${observe.url}/ingest/${credential.ses}`,
      token: credential.secret,
      headers: { 'X-Walkeros-Binding': observe.binding },
      onStatus: (status) => {
        if (status !== 401) return;
        // The observer rejected this credential (session ended or token
        // revoked): self-heal the slot -- CAS, only while it still holds
        // exactly this credential -- and detach, so posting stops and the
        // next pageview is back on the silent zero-work path.
        clearObserveSlotIf(raw);
        if (observer) instance.observers.delete(observer);
      },
    });
    // Baked scoping: a wrap (e.g. a preview artifact) may carry a public
    // flowId/level/sample on the connect config. flowId overrides the local
    // config name on every posted record so they land under the platform's
    // flow id; a baked level also drives the collector-wide capture supplier
    // so destination call capture runs at trace.
    observer = createTelemetryObserver(
      withFlowId(withRelease(post, instance.release), observe.flowId),
      {
        flowId: observe.flowId ?? flowId,
        ...(observe.level !== undefined ? { level: observe.level } : {}),
        ...(observe.sample !== undefined ? { sample: observe.sample } : {}),
      },
    );
    instance.observers.add(observer);
    const bakedLevel = observe.level;
    if (bakedLevel !== undefined) {
      instance.observeLevel = () => bakedLevel;
    }
    return;
  }

  // Server arm: the config trio is the credential; attach directly.
  // 'off' opts out entirely (no observer, zero emit-path work).
  if (observe.level === 'off') return;
  instance.observers.add(
    createTelemetryObserver(
      withRelease(
        createBatchedPoster({
          url: `${observe.url}/ingest/${observe.sessionId}`,
          token: observe.token,
        }),
        instance.release,
      ),
      { flowId, level: observe.level, sample: observe.sample },
    ),
  );
}

export async function startFlow<ElbPush extends Elb.Fn = Elb.Fn>(
  initConfig?: Collector.InitConfig,
): Promise<StartFlow<ElbPush>> {
  initConfig = initConfig || {};
  const instance = await collector(initConfig);

  // Attach the advisory observation channel before source init and the run
  // command, so source-init and run-phase records are captured.
  installObserve(instance, initConfig);

  // Initialize sources; the collector's elb adapter is already available
  await initSources(instance, initConfig.sources || {});

  const { consent, user, globals, custom } = initConfig;

  // Route all four startup state cells through `command` so each bumps
  // `stateVersion`, broadcasts to subscribers, and triggers reconcile. A bare
  // `Object.assign` for globals/custom would silently skip those, leaving a
  // `require:["globals"]` step un-reconciled and `on('globals')` subscribers
  // un-notified at startup.
  if (consent) await instance.command('consent', consent);
  if (user) await instance.command('user', user);
  if (globals) await instance.command('globals', globals);
  if (custom) await instance.command('custom', custom);

  if (instance.config.run) await instance.command('run');

  // Determine the primary elb:
  // 1. Use explicitly marked primary source
  // 2. Use first source if any exist
  // 3. Fallback to the collector's elb adapter
  let primaryElb: Elb.Fn = instance.elb;

  const sources = Object.values(instance.sources);

  // First, check for explicitly marked primary source
  const markedPrimary = sources.find(
    (source) => (source.config as { primary?: boolean }).primary,
  );

  if (markedPrimary) {
    primaryElb = markedPrimary.push as Elb.Fn;
  } else if (sources.length > 0) {
    // Use first source as default
    primaryElb = sources[0].push as Elb.Fn;
  }

  return {
    collector: instance,
    elb: primaryElb as ElbPush,
  };
}
