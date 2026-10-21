import type {
  Collector,
  Destination,
  Elb,
  EmitFn,
  ObserveSlot,
  ObserverFn,
  Source,
  Store,
  Transformer,
} from '@walkeros/core';
import {
  createBatchedPoster,
  createTelemetryObserver,
  parseObserveCredential,
} from '@walkeros/core';
import type { StartFlow } from './types';
import { collector } from './collector';
import { initSources } from './source';

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
 * Run one call into a caller-supplied `ObserveSlot`. The slot is caller code
 * on the advisory path: a throwing or non-conforming one (e.g.
 * `slot: pageObserveSlot`, not called) logs one ERROR line and returns
 * undefined, so the caller turns Observe off and the flow runs on.
 */
function callSlot<T>(
  instance: Collector.Instance,
  call: () => T,
): { value: T } | undefined {
  try {
    return { value: call() };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    instance.logger.error(
      `observe: the slot failed, Observe is off: ${reason}`,
    );
    return undefined;
  }
}

/**
 * Install the advisory observation channel configured on `initConfig`: an
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
  const observe = initConfig.observe;
  if (!observe) return;

  const flowId = instance.name ?? 'default';

  if ('binding' in observe) {
    // Web arm: the credential arrives out-of-band and the slot reads it
    // (`pageObserveSlot()` from @walkeros/web-core: the elbObserve URL param,
    // or the storage slot the preview activator ferries it into). The type
    // requires the slot; a JS or JSON caller can still omit it, so its
    // absence is an ERROR at the default level, never a silent no-op.
    const slot: ObserveSlot | undefined = observe.slot;
    if (!slot) {
      instance.logger.error(
        'observe: a web observe config needs slot: pageObserveSlot() from @walkeros/web-core',
      );
      return;
    }

    // Truly absent means zero work: no parse, no storage write, no observer.
    const read = callSlot(instance, () => slot.read());
    if (!read?.value) return;
    const { raw, fromUrl } = read.value;

    // A present-but-broken credential is warned, never silently dropped;
    // only the truly-absent case above is silent (zero-work contract).
    const credential = parseObserveCredential(raw);
    if (!credential) {
      if (fromUrl) {
        // URL-sourced garbage never touches stored state (anti-griefing).
        instance.logger.warn('observe: malformed credential ignored');
      } else {
        // Slot-sourced garbage: stored state clears on its own failure, so
        // self-heal instead of warning on every pageview.
        instance.logger.warn('observe: malformed stored credential cleared');
        callSlot(instance, () => slot.clear(raw));
      }
      return;
    }
    if (credential.pb !== observe.binding) {
      instance.logger.warn(
        'observe: credential binding mismatch, credential ignored',
      );
      return;
    }

    // Persist the credential; a URL-borne copy is then redundant and, being
    // a bearer credential, the slot strips it from the address bar.
    if (!callSlot(instance, () => slot.keep(raw, fromUrl))) return;

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
        // next pageview is back on the silent zero-work path. A throwing
        // clear is reported and never skips the detach.
        callSlot(instance, () => slot.clear(raw));
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
  // Mirror the web arm: a configured level also drives the collector-wide
  // capture supplier, so 'trace' enables destination call capture.
  const serverLevel = observe.level;
  if (serverLevel !== undefined) {
    instance.observeLevel = () => serverLevel;
  }
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

/**
 * Creates a collector, initializes its sources and runs the flow.
 *
 * Each step entry is typed from its own `code`: settings, mapping rule
 * settings and `env` keys autocomplete and are checked per entry. An entry
 * without inferable Types (a code-less hop, an untyped mock) stays loose on
 * its own. Write the config inline: an explicit type argument
 * (`startFlow<Push>(...)`) turns the inference off for the whole call.
 */
export async function startFlow<
  ElbPush extends Elb.Fn = Elb.Fn,
  S = Record<string, Source.TypesGeneric>,
  D = Record<string, Destination.TypesGeneric>,
  T = Record<string, Transformer.TypesGeneric>,
  St = Record<string, Store.TypesGeneric>,
>(
  initConfig?: Collector.InitConfigOf<S, D, T, St>,
): Promise<StartFlow<ElbPush>> {
  const config: Collector.InitConfig = initConfig ?? {};
  const instance = await collector(config);

  // Caller-supplied observers land in the advisory Set verbatim.
  if (config.observers) {
    for (const observer of config.observers) {
      instance.observers.add(observer);
    }
  }

  // Attach the advisory observation channel before source init and the run
  // command, so source-init and run-phase records are captured. Build flag
  // (see @walkeros/core build-flags): a lean bundle folds the poster out.
  if (typeof __WALKEROS_OBSERVE__ === 'undefined' || __WALKEROS_OBSERVE__) {
    installObserve(instance, config);
  } else if (config.observe) {
    instance.logger.error('observe: not in this build, config ignored');
  }

  // Initialize sources; the collector's elb adapter is already available
  await initSources(instance, config.sources || {});

  const { consent, user, globals, custom } = config;

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

  // First, check for explicitly marked primary source. `initSources` mirrors a
  // top-level `InitSource.primary` onto the instance config, so both spellings
  // are visible here.
  const markedPrimary = sources.find((source) => source.config.primary);

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
