import path from 'path';
import { pathToFileURL } from 'url';
import {
  JSDOM,
  VirtualConsole,
  requestInterceptor,
  type ResourcesOptions,
} from 'jsdom';
import type { Logger } from '@walkeros/core';
import type { NetworkCall, PushResult } from './types.js';
import { getErrorMessage } from '../../core/utils.js';
import { installTimerInterception, type TimerControl } from './async-drain.js';
import { startDrainPump } from './async-drain-pump.js';

export interface FlowContextOptions {
  esmPath: string;
  platform: 'web' | 'server';
  logger: Logger.Instance;
  snapshotCode?: string;
  timeout?: number;
  /** When provided, fetch, sendBeacon and XHR are stubbed, recording here */
  networkCalls?: NetworkCall[];
  /** Enable timer interception + async drain after callback completes */
  asyncDrain?: { timeout?: number };
  /**
   * Run the async-drain pump alongside `fn` to fire captured timers
   * immediately. Required for non-simulate web pushes whose destinations
   * await real timers during init (e.g., amplitude engagement plugin
   * awaiting a 10s setTimeout for CDN script load).
   *
   * Defaults to false to preserve `--simulate` snapshot ordering. The
   * dispatcher in `run.ts` sets this to true ONLY for the `'none'` route
   * (real `walkeros push`).
   */
  drainPump?: boolean;
  /** Web only: the URL of the simulated page. Defaults to `http://localhost`. */
  pageUrl?: string;
  /**
   * Web only, for simulate runs: the page answers every resource request (a
   * vendor loader's `<script src>`, an iframe, a stylesheet) locally instead
   * of fetching it. A real push loads resources as a browser would.
   */
  offline?: boolean;
}

/**
 * JSDOM window members a web step reaches as bare globals (a CMP trigger's
 * `new CustomEvent`, a session source's `localStorage`, an `instanceof
 * Element` check). Exposed for the run, so events are created in the page's
 * own realm and its nodes pass type checks as in a browser, and restored after.
 * Vendor SDKs read some at import, before any step runs: mixpanel-browser
 * probes `new XMLHttpRequest()`, posthog-js reads `location` and adopts
 * `self`. `XMLHttpRequest` is the recording one of `applyNetworkPolyfills`.
 */
const DOM_GLOBALS = [
  'CustomEvent',
  'Event',
  'localStorage',
  'sessionStorage',
  'Node',
  'Element',
  'HTMLElement',
  'Document',
  'ShadowRoot',
  'XMLHttpRequest',
  'location',
  'self',
] as const;

/**
 * Defines each DOM global from the JSDOM window and returns a restore that
 * puts every previous property descriptor back (deleting the ones that were
 * absent). Descriptors, not values: reading Node's own `localStorage` getter
 * would run it.
 */
export function exposeDomGlobals(domWindow: object): () => void {
  const saved = DOM_GLOBALS.map(
    (name) =>
      [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  );
  // Read every value before defining any: a getter that throws (JSDOM's
  // storage on an opaque origin) leaves the globals untouched.
  const values = DOM_GLOBALS.map(
    (name) => [name, Reflect.get(domWindow, name)] as const,
  );
  for (const [name, value] of values) {
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  return () => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
}

/**
 * Loosely typed module shape from a dynamically imported ESM bundle.
 * The bundle has no compile-time types, so we use permissive signatures
 * and let the callbacks do runtime validation (e.g., "collector missing push").
 */
export interface FlowModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wireConfig: (data?: unknown) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startFlow: (config: unknown) => Promise<any>;
  __configData?: unknown;
  /**
   * Registry of lazy /dev loaders, one per package that exposes a `./dev`
   * export. Each entry is a thunk that dynamically imports the dev module on
   * demand, so the deploy wrap can DCE the unreferenced /dev graph to zero
   * bytes. Read sites must call and await the thunk, then narrow the result.
   */
  __devExports?: Record<string, () => Promise<unknown>>;
  /**
   * Export names each package declares in `walkerOS.exports`, read at build
   * time from the copy that was bundled. Absent in bundles built before it.
   */
  __packageExports?: Record<string, string[]>;
}

/**
 * Set up execution environment (JSDOM for web, snapshot eval),
 * import the ESM bundle, validate wireConfig/startFlow, then
 * call the provided function with the loaded module.
 *
 * Handles: JSDOM global injection, Node 22 navigator compat,
 * snapshot eval, ESM import with cache bust, error wrapping,
 * global cleanup in finally.
 */
/**
 * Default error mapper used by real-push call sites: produces a `PushResult`
 * error envelope. Simulate call sites override this with a mapper that returns
 * a `Simulation.Result` instead.
 */
function defaultPushError(error: unknown, startTime: number): PushResult {
  return {
    success: false,
    duration: Date.now() - startTime,
    error: getErrorMessage(error),
  };
}

// Real-push call sites: default `PushResult`, no error mapper needed.
export function withFlowContext(
  options: FlowContextOptions,
  fn: (module: FlowModule) => Promise<PushResult>,
): Promise<PushResult>;
// Simulate call sites: arbitrary result type with an explicit error mapper.
export function withFlowContext<T>(
  options: FlowContextOptions,
  fn: (module: FlowModule) => Promise<T>,
  onError: (error: unknown, startTime: number) => T,
): Promise<T>;
export async function withFlowContext<T>(
  options: FlowContextOptions,
  fn: (module: FlowModule) => Promise<T | PushResult>,
  onError?: (error: unknown, startTime: number) => T,
): Promise<T | PushResult> {
  const {
    esmPath,
    platform,
    logger,
    snapshotCode,
    timeout,
    networkCalls,
    asyncDrain,
    drainPump,
    pageUrl,
    offline,
  } = options;
  const startTime = Date.now();
  const g = global as unknown as Record<string, unknown>;
  let savedWindow: unknown, savedDocument: unknown, savedNavigator: unknown;
  let savedFetch: typeof fetch | undefined;
  let dom: JSDOM | undefined;
  let timerControl: TimerControl | undefined;
  let restoreDomGlobals: (() => void) | undefined;

  // JSDOM setup for web platform
  if (platform === 'web') {
    const virtualConsole = new VirtualConsole();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: pageUrl ?? 'http://localhost',
      runScripts: 'dangerously',
      resources: offline ? offlineResources() : 'usable',
      virtualConsole,
    });
    savedWindow = g.window;
    savedDocument = g.document;
    savedNavigator = g.navigator;
    g.window = dom.window;
    g.document = dom.window.document;
    Object.defineProperty(global, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });

    // Apply network polyfills when capture array is provided
    if (networkCalls) {
      savedFetch = global.fetch;
      applyNetworkPolyfills(dom, networkCalls);
      global.fetch = dom.window.fetch as typeof fetch;
    }
  }

  // Install timer interception AFTER JSDOM setup, BEFORE ESM import
  // so the bundle's top-level setTimeout references are captured
  if (asyncDrain) {
    timerControl = installTimerInterception({
      domWindow:
        platform === 'web' && dom
          ? (dom.window as unknown as Window & typeof globalThis)
          : undefined,
    });
  }

  try {
    // Inside the try, so a failure here still restores window, document
    // and navigator in the finally.
    if (dom) restoreDomGlobals = exposeDomGlobals(dom.window);

    // Eval snapshot before importing bundle
    if (snapshotCode) {
      if (platform === 'web' && dom) {
        logger.debug('Evaluating snapshot in JSDOM');
        dom.window.eval(snapshotCode);
      } else {
        logger.debug('Evaluating snapshot in Node');
        const vm = await import('vm');
        vm.runInThisContext(snapshotCode);
      }
    }

    // Import ESM bundle with cache bust. Node runtime import() accepts
    // file:// URLs; for paths embedded into source for esbuild bundling
    // use core/import-specifier.ts instead (esbuild rejects file://).
    //
    // A node skeleton keeps `@walkeros/*` step packages as EXTERNAL bare
    // imports. Node resolves those bare specifiers by walking `node_modules`
    // up from the IMPORTING FILE's directory (`esmPath`), not from cwd, and
    // the `?t=` cache-buster does not affect resolution. So externals load
    // from a `node_modules/` co-located next to `esmPath`. Callers that point
    // `esmPath` at a prebuilt skeleton MUST place the traced sibling
    // `node_modules/` in the same directory.
    const fileUrl = pathToFileURL(path.resolve(esmPath)).href;
    const module = await import(`${fileUrl}?t=${Date.now()}`);
    const { wireConfig, startFlow } = module;

    if (typeof wireConfig !== 'function' || typeof startFlow !== 'function') {
      throw new Error(
        'Invalid ESM bundle: missing wireConfig or startFlow exports',
      );
    }

    const flowModule: FlowModule = {
      wireConfig,
      startFlow,
      __configData: module.__configData,
      __devExports: module.__devExports,
      __packageExports: module.__packageExports,
    };

    // Execute step-specific logic
    if (timerControl) {
      // asyncDrain mode: no outer timeout (flush has its own wall-clock safety).
      // When drainPump is requested, fire captured timers alongside `fn` so
      // destinations awaiting an intercepted setTimeout during init don't
      // deadlock (see async-drain-pump.ts for context).
      const stopPump = drainPump ? startDrainPump(timerControl.pending) : null;
      let result: T | PushResult;
      try {
        result = await fn(flowModule);
      } finally {
        if (stopPump) stopPump();
      }
      await timerControl.flush(asyncDrain?.timeout ?? 5000);
      return result;
    } else if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Push timeout after ${timeout}ms`)),
          timeout,
        );
      });
      return await Promise.race([fn(flowModule), timeoutPromise]);
    }

    return await fn(flowModule);
  } catch (error) {
    return (onError ?? defaultPushError)(error, startTime);
  } finally {
    if (timerControl) timerControl.restore();
    if (savedFetch !== undefined) {
      cleanupNetworkPolyfills(savedFetch);
    }
    if (restoreDomGlobals) restoreDomGlobals();
    if (platform === 'web') {
      if (savedWindow !== undefined) g.window = savedWindow;
      else delete g.window;
      if (savedDocument !== undefined) g.document = savedDocument;
      else delete g.document;
      if (savedNavigator !== undefined) {
        Object.defineProperty(global, 'navigator', {
          value: savedNavigator,
          configurable: true,
          writable: true,
        });
      } else {
        delete g.navigator;
      }
    }
  }
}

/**
 * Install no-op fetch, sendBeacon and XMLHttpRequest polyfills on the JSDOM
 * window. All record calls to the provided capture array.
 * Also overrides global.fetch so ESM bundle code (which resolves fetch
 * from Node's global scope, not window) gets the polyfill too.
 */
export function applyNetworkPolyfills(
  dom: JSDOM,
  networkCalls: NetworkCall[],
): void {
  // Polyfill fetch on the JSDOM window
  dom.window.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const body =
      init?.body !== undefined && init?.body !== null
        ? String(init.body)
        : null;

    // Extract headers
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headers[k] = v;
        });
      } else if (typeof init.headers === 'object') {
        Object.entries(init.headers as Record<string, string>).forEach(
          ([k, v]) => {
            headers[k] = v;
          },
        );
      }
    }

    networkCalls.push({
      type: 'fetch',
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
    });

    return new Response('', { status: 200, statusText: 'OK' });
  }) as typeof fetch;

  // Polyfill sendBeacon on navigator
  dom.window.navigator.sendBeacon = (
    url: string,
    data?: BodyInit | null,
  ): boolean => {
    const body = data !== undefined && data !== null ? String(data) : null;
    networkCalls.push({ type: 'beacon', url, body, timestamp: Date.now() });
    return true;
  };

  // JSDOM's own XMLHttpRequest sends for real, a synchronous one from a
  // worker process. Like fetch and sendBeacon above, the stand-in records
  // instead, on a real web push too: the page's requests are reported, never
  // sent. The stand-in is not the full interface, so it is defined rather
  // than assigned.
  Object.defineProperty(dom.window, 'XMLHttpRequest', {
    value: createRecordingXhr(dom, networkCalls),
    configurable: true,
    writable: true,
  });
}

type XhrHandler = ((event: Event) => void) | null;

/**
 * An XMLHttpRequest whose `send` records the call and completes it with an
 * empty 200, like the fetch polyfill. It never opens a connection. `abort`
 * after `send` ends the request with abort instead, as the spec's does.
 */
function createRecordingXhr(dom: JSDOM, networkCalls: NetworkCall[]) {
  const PageEvent = dom.window.Event;
  return class XMLHttpRequest extends dom.window.EventTarget {
    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;
    readonly UNSENT = 0;
    readonly OPENED = 1;
    readonly HEADERS_RECEIVED = 2;
    readonly LOADING = 3;
    readonly DONE = 4;
    readyState = 0;
    status = 0;
    statusText = '';
    responseType = '';
    response = '';
    responseText = '';
    responseURL = '';
    timeout = 0;
    withCredentials = false;
    onreadystatechange: XhrHandler = null;
    onload: XhrHandler = null;
    onabort: XhrHandler = null;
    onloadend: XhrHandler = null;
    #method = 'GET';
    #url = '';
    #async = true;
    #headers: Record<string, string> = {};
    #pending = false;

    open(method: string, url: string | URL, async = true): void {
      this.#method = method.toUpperCase();
      this.#url = String(url);
      this.#async = async;
      this.#headers = {};
      this.#pending = false;
      this.readyState = 1;
    }

    setRequestHeader(name: string, value: string): void {
      this.#headers[name] = value;
    }

    getResponseHeader(): string | null {
      return null;
    }

    getAllResponseHeaders(): string {
      return '';
    }

    overrideMimeType(): void {}

    abort(): void {
      const pending = this.#pending;
      this.#pending = false;
      if (!pending && this.readyState !== 4) return;
      // Ends as a network error, then back to UNSENT: with events only while
      // the request is pending, silently once it is done.
      this.status = 0;
      this.statusText = '';
      if (pending) this.#finish('abort', this.onabort);
      this.readyState = 0;
    }

    send(body?: unknown): void {
      networkCalls.push({
        type: 'xhr',
        url: this.#url,
        method: this.#method,
        body: body !== undefined && body !== null ? String(body) : null,
        headers: { ...this.#headers },
        timestamp: Date.now(),
      });
      this.#pending = true;
      if (this.#async) queueMicrotask(() => this.#complete());
      else this.#complete();
    }

    #complete(): void {
      if (!this.#pending) return;
      this.#pending = false;
      this.status = 200;
      this.statusText = 'OK';
      this.responseURL = this.#url;
      this.#finish('load', this.onload);
    }

    #finish(outcome: 'load' | 'abort', onOutcome: XhrHandler): void {
      this.readyState = 4;
      const handlers: Array<[string, XhrHandler]> = [
        ['readystatechange', this.onreadystatechange],
        [outcome, onOutcome],
        ['loadend', this.onloadend],
      ];
      for (const [type, handler] of handlers) {
        const event = new PageEvent(type);
        this.dispatchEvent(event);
        handler?.call(this, event);
      }
    }
  };
}

/**
 * Resource loading of a simulated page: every request (a vendor loader's
 * script, an iframe, a stylesheet) is answered with an empty 200 before any
 * dispatcher runs, so none leaves the process.
 */
function offlineResources(): ResourcesOptions {
  return {
    interceptors: [requestInterceptor(() => new Response('', { status: 200 }))],
  };
}

/**
 * Restore global.fetch to its original value.
 */
export function cleanupNetworkPolyfills(savedFetch: typeof fetch): void {
  global.fetch = savedFetch;
}
