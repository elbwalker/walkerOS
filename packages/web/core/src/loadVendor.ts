import { resolveDestinationTimeout, StepError } from '@walkeros/core';

/** Attribute on every script `loadVendor` injects. */
export const VENDOR_SCRIPT_MARKER = 'data-walkeros-vendor';

export interface LoadVendorOptions {
  /** The destination's timeout; the load deadline is its resolved value. */
  timeout?: number;
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

/** One script per src on the page: a failure is never re-injected. */
const injected = new Map<string, Injected>();

function inject(src: string, timeout: number): Injected {
  const known = injected.get(src);
  if (known) return known;

  const entry: Injected = {
    state: 'loading',
    expired: false,
    timeout,
    waiting: [],
  };
  injected.set(src, entry);

  const settle = (outcome: Outcome) => {
    const waiting = entry.waiting;
    entry.waiting = [];
    waiting.forEach((notify) => notify(outcome));
  };

  const timer = setTimeout(() => {
    entry.expired = true;
    settle('expired');
  }, timeout);

  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.setAttribute(VENDOR_SCRIPT_MARKER, '');
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
  document.head.appendChild(script);

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
 * Injects a vendor script once per `src` (marked `data-walkeros-vendor`) and
 * reports its readiness. The deadline runs from the injection and equals the
 * destination's resolved timeout, so an awaited `ready()` settles before the
 * push's own timeout. Without `src` (the page loads the vendor) nothing is
 * injected and there is no deadline.
 */
export function loadVendor<T>(
  src: string | undefined,
  get: () => T | undefined,
  options: LoadVendorOptions = {},
): Vendor<T> {
  const script = src
    ? inject(src, resolveDestinationTimeout(options.timeout))
    : undefined;

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
