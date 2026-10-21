import { resolveDestinationTimeout, StepError } from '@walkeros/core';

/** Attribute on every script `loadVendor` injects. */
export const VENDOR_SCRIPT_MARKER = 'data-walkeros-vendor';

export interface LoadVendorOptions {
  /** The destination's timeout; the load deadline is its resolved value. */
  timeout?: number;
  /**
   * Attributes the vendor's tag needs (e.g. `data-domain`), set before the
   * script is inserted. `src` and the marker cannot be overwritten.
   */
  attributes?: Record<string, string>;
  /**
   * The document the script goes into, and whose scripts are the registry:
   * the destination's env one (`getEnv(env).document`). The global document
   * without it.
   */
  document?: Document;
}

export interface Vendor<T> {
  /**
   * Resolves with the vendor once its script loaded and `get()` finds it.
   * Rejects `vendor-not-loaded` after the script's `error` (final for the
   * page), `vendor-not-ready` when the vendor is missing, `vendor-timeout`
   * when the script did not load by the deadline. Past the deadline, and
   * without a script, it checks `get()` on each call.
   */
  ready(): Promise<T>;
  /**
   * For vendors that replay their own stub (called synchronously): throws
   * `vendor-not-loaded` once the injected script fired `error`.
   */
  check(): void;
}

type Outcome = 'loaded' | 'failed' | 'expired';

interface Injected {
  state: 'loading' | 'loaded' | 'failed';
  /** The deadline passed before the script loaded or failed. */
  expired: boolean;
  timeout: number;
  waiting: Array<(outcome: Outcome) => void>;
}

/** The state of each vendor script, kept with its element. */
const injected = new WeakMap<Element, Injected>();

/**
 * The page's script for `src`. The page itself is the registry: its one
 * marked script with that src means the src was injected (once per page, a
 * failure is never re-injected), and another document has its own.
 */
function scriptOf(doc: Document, src: string): HTMLScriptElement | undefined {
  const marked = doc.querySelectorAll<HTMLScriptElement>(
    `script[${VENDOR_SCRIPT_MARKER}]`,
  );
  return Array.from(marked).find(
    (script) => script.getAttribute('src') === src,
  );
}

function inject(
  doc: Document,
  src: string,
  timeout: number,
  attributes: Record<string, string>,
  available: () => boolean,
): Injected {
  const existing = scriptOf(doc, src);
  const known = existing && injected.get(existing);
  if (known) return known;

  const entry: Injected = {
    state: 'loading',
    expired: false,
    timeout,
    waiting: [],
  };

  // A marked script without state (another bundle's) is adopted, not
  // doubled. Its `load` may have fired already: with the vendor there, it is
  // ready at once; otherwise it is watched like an own script.
  if (existing && available()) {
    entry.state = 'loaded';
    injected.set(existing, entry);
    return entry;
  }
  const script = existing ?? doc.createElement('script');

  const settle = (outcome: Outcome) => {
    const waiting = entry.waiting;
    entry.waiting = [];
    waiting.forEach((notify) => notify(outcome));
  };

  const timer = setTimeout(() => {
    entry.expired = true;
    settle('expired');
  }, timeout);

  injected.set(script, entry);
  script.addEventListener('load', () => {
    clearTimeout(timer);
    entry.state = 'loaded';
    settle('loaded');
  });
  script.addEventListener('error', () => {
    clearTimeout(timer);
    entry.state = 'failed';
    settle('failed');
  });

  if (!existing) {
    for (const [name, value] of Object.entries(attributes))
      script.setAttribute(name, value);
    // After the attributes, so they never replace the src or the marker.
    script.src = src;
    script.async = true;
    script.setAttribute(VENDOR_SCRIPT_MARKER, '');
    doc.head.appendChild(script);
  }

  return entry;
}

const notLoaded = () =>
  new StepError('Vendor script failed to load', { code: 'vendor-not-loaded' });

const notReady = () =>
  new StepError('Vendor not ready: its global is missing', {
    code: 'vendor-not-ready',
  });

const timedOut = (timeout: number) =>
  new StepError(`Vendor script did not load within ${timeout}ms`, {
    code: 'vendor-timeout',
  });

/**
 * Injects a vendor script once per `src` on the page (marked
 * `data-walkeros-vendor`, with the `attributes` its tag needs) and reports
 * its readiness. The deadline runs from the injection and equals the
 * destination's resolved timeout, so an awaited `ready()` settles before the
 * push's own timeout. Without `src` (the page loads the vendor) nothing is
 * injected and there is no deadline. A `src` with no document to inject
 * into (neither `options.document` nor a global one) throws
 * `vendor-not-ready`.
 */
export function loadVendor<T>(
  src: string | undefined,
  get: () => T | undefined,
  options: LoadVendorOptions = {},
): Vendor<T> {
  const available = () => {
    const vendor = get();
    return vendor !== undefined && vendor !== null;
  };

  let script: Injected | undefined;
  if (src) {
    const doc =
      options.document ??
      (typeof document !== 'undefined' ? document : undefined);
    if (!doc)
      throw new StepError(`Vendor script ${src} has no document to go into`, {
        code: 'vendor-not-ready',
      });
    script = inject(
      doc,
      src,
      resolveDestinationTimeout(options.timeout),
      options.attributes ?? {},
      available,
    );
  }

  const present = (): Promise<T> => {
    const vendor = get();
    return vendor === undefined || vendor === null
      ? Promise.reject(notReady())
      : Promise.resolve(vendor);
  };

  return {
    ready() {
      if (!script) return present();
      if (script.state === 'failed') return Promise.reject(notLoaded());
      if (script.state === 'loaded' || script.expired) return present();

      return new Promise<T>((resolve, reject) => {
        script.waiting.push((outcome) => {
          if (outcome === 'failed') reject(notLoaded());
          else if (outcome === 'expired') reject(timedOut(script.timeout));
          else present().then(resolve, reject);
        });
      });
    },
    check() {
      if (script?.state === 'failed') throw notLoaded();
    },
  };
}
