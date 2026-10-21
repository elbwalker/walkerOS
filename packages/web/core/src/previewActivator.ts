import type {
  ActivationGrant,
  PreviewCrypto,
  PreviewKey,
} from '@walkeros/core';
import { OBSERVE_STORAGE_KEY, verifyActivation } from '@walkeros/core';
import { injectScript } from './injectScript';

export interface SwapActivatorConfig {
  keyring: PreviewKey[];
  iss: string;
  /** This bundle's project binding. Absent on demo hosts (see acceptForeign). */
  pb?: string;
  acceptForeign?: boolean;
  demoAllowlist?: string[];
  /** Bare CDN hostname, e.g. 'cdn.walkeros.io'. */
  previewOrigin: string;
  /** Injectable for tests. */
  now?: () => number;
  crypto?: PreviewCrypto;
}

const STORAGE_KEY = 'elbPreview';
/**
 * Storage slot for the session-forwarding companion grant. The web arm never
 * verifies it (it is session-bound by design; the session container is its
 * verifier): the activator only ferries it from the activation URL into
 * storage, where the seamed preview artifact reads it to stamp the
 * `X-Walkeros-Preview` header. It lives and dies with the activation state:
 * set (or cleared) whenever a URL activation succeeds, cleared whenever the
 * stored activation clears.
 */
export const SESSION_STORAGE_KEY = 'elbPreviewSession';
const LOG = '[walkerOS:preview]';
const SWAP_TIMEOUT_MS = 5000;

interface PreviewStore {
  get(): string | null;
  set(value: string): void;
  clear(): void;
}

/** localStorage under `key`, with an in-memory fallback for Safari private mode. */
function createStore(key: string): PreviewStore {
  let memory: string | null = null;
  return {
    get() {
      try {
        return window.localStorage.getItem(key) ?? memory;
      } catch {
        return memory;
      }
    },
    set(value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        memory = value;
      }
    },
    clear() {
      memory = null;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // in-memory copy already cleared
      }
    },
  };
}

function stripParam(): void {
  if (typeof URLSearchParams === 'undefined') return;
  try {
    const href = window.location.href;
    const hashIdx = href.indexOf('#');
    const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';
    const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    const qIdx = withoutHash.indexOf('?');
    const path = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
    const params = new URLSearchParams(
      qIdx >= 0 ? withoutHash.slice(qIdx + 1) : '',
    );
    params.delete('elbPreview');
    params.delete('elbPreviewSession');
    params.delete('elbObserve');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${path}${query ? `?${query}` : ''}${hash}`,
    );
  } catch {
    // A page that forbids history writes still previews; the param just stays.
  }
}

/**
 * Decide whether a preview bundle should boot in place of this bundle's own flow.
 *
 * Returns true iff a preview took over, in which case the caller must not boot
 * the production flow. Every failure path deterministically returns false: the
 * loader never throws, never retries, and never leaves a page without a walker.
 *
 * Anti-griefing invariant: a rejected URL grant never touches stored state,
 * the activator falls back to the stored grant instead. Only a failing stored
 * grant clears storage (self-heal), plus `off` and `swap-failed`.
 */
export async function browserSwapActivator(
  cfg: SwapActivatorConfig,
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return false;
  const win = window;

  const store = createStore(STORAGE_KEY);
  const sessionStore = createStore(SESSION_STORAGE_KEY);
  const observeStore = createStore(OBSERVE_STORAGE_KEY);
  const now = cfg.now ?? (() => Date.now());
  const warn = (reason: string) => console.warn(`${LOG} ${reason}`);

  let param: string | null = null;
  let companion: string | null = null;
  let observeCompanion: string | null = null;
  if (typeof URLSearchParams !== 'undefined') {
    try {
      const search = new URLSearchParams(
        win.location.search.replace(/^\?/, ''),
      );
      const values = search.getAll('elbPreview');
      param = values.length > 0 ? (values[values.length - 1] ?? null) : null;
      const companions = search.getAll('elbPreviewSession');
      companion =
        companions.length > 0
          ? (companions[companions.length - 1] ?? null)
          : null;
      const observes = search.getAll('elbObserve');
      observeCompanion =
        observes.length > 0 ? (observes[observes.length - 1] ?? null) : null;
    } catch {
      param = null;
      companion = null;
      observeCompanion = null;
    }
  }

  if (param === 'off') {
    store.clear();
    sessionStore.clear();
    observeStore.clear();
    stripParam();
    return false;
  }

  const stored = store.get();

  // Zero-work fast path: the overwhelmingly common case on a production page.
  // No crypto, no storage writes, no DOM work.
  if (!param && !stored) return false;

  const verify = (raw: string, source: 'url' | 'storage') =>
    verifyActivation(raw, {
      keyring: cfg.keyring,
      iss: cfg.iss,
      origin: win.location.origin,
      pb: cfg.pb,
      acceptForeign: cfg.acceptForeign,
      demoAllowlist: cfg.demoAllowlist,
      source,
      now: now(),
      crypto: cfg.crypto,
    });

  let grant: ActivationGrant | null = null;

  // 1) URL grant first. Rejection for any reason (malformed, unsigned, bad
  //    signature, expired, wrong aud) is warned and ignored, and must never
  //    clear stored state: verification runs cheap checks before crypto, so
  //    at rejection time we cannot know whether the value was even one of
  //    ours, and a crafted link must not end someone's active session.
  if (param) {
    const result = await verify(param, 'url');
    if (result.ok) {
      grant = result.grant;
      store.set(param);
      // The URL activation defines the session context: carry its companion
      // forwarding grant into storage, or clear a stale one from an earlier
      // session. Never verified here: the session container is its verifier.
      if (companion) sessionStore.set(companion);
      else sessionStore.clear();
      // Same rule for the observe ingest credential: ferried raw, never
      // verified here (the observer is its verifier).
      if (observeCompanion) observeStore.set(observeCompanion);
      else observeStore.clear();
    } else {
      warn(result.reason);
    }
    stripParam();
  }

  // 2) Fall back to the stored grant. This one clears on failure: it came
  //    from our own storage, so clearing is self-healing, not griefable.
  //    (Except `no-subtle`: that is the environment's fault, not the grant's.)
  if (!grant && stored) {
    const result = await verify(stored, 'storage');
    if (result.ok) {
      grant = result.grant;
    } else {
      warn(result.reason);
      if (result.reason !== 'no-subtle') {
        store.clear();
        sessionStore.clear();
        observeStore.clear();
      }
    }
  }

  if (!grant) return false;

  const src = `https://${cfg.previewOrigin}/preview/${grant.art}.js`;
  const loaded = await injectScript(src, grant.sri, SWAP_TIMEOUT_MS);

  if (!loaded) {
    warn('swap-failed');
    store.clear();
    sessionStore.clear();
    observeStore.clear();
    return false;
  }

  console.info(
    `${LOG} active ${grant.art} ends ${new Date(grant.sxp * 1000).toISOString()}`,
  );
  return true;
}
