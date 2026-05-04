import path from 'path';
import { pathToFileURL } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';
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
  /** When provided, fetch/sendBeacon are polyfilled and calls recorded here */
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
  __devExports?: Record<string, unknown>;
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
export async function withFlowContext(
  options: FlowContextOptions,
  fn: (module: FlowModule) => Promise<PushResult>,
): Promise<PushResult> {
  const {
    esmPath,
    platform,
    logger,
    snapshotCode,
    timeout,
    networkCalls,
    asyncDrain,
    drainPump,
  } = options;
  const startTime = Date.now();
  const g = global as unknown as Record<string, unknown>;
  let savedWindow: unknown, savedDocument: unknown, savedNavigator: unknown;
  let savedFetch: typeof fetch | undefined;
  let dom: JSDOM | undefined;
  let timerControl: TimerControl | undefined;

  // JSDOM setup for web platform
  if (platform === 'web') {
    const virtualConsole = new VirtualConsole();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
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

    // Import ESM bundle with cache bust
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
    };

    // Execute step-specific logic
    if (timerControl) {
      // asyncDrain mode: no outer timeout (flush has its own wall-clock safety).
      // When drainPump is requested, fire captured timers alongside `fn` so
      // destinations awaiting an intercepted setTimeout during init don't
      // deadlock (see async-drain-pump.ts for context).
      const stopPump = drainPump ? startDrainPump(timerControl.pending) : null;
      let result: PushResult;
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
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    if (timerControl) timerControl.restore();
    if (savedFetch !== undefined) {
      cleanupNetworkPolyfills(savedFetch);
    }
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
 * Install no-op fetch and sendBeacon polyfills on the JSDOM window.
 * Both record calls to the provided capture array.
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
}

/**
 * Restore global.fetch to its original value.
 */
export function cleanupNetworkPolyfills(savedFetch: typeof fetch): void {
  global.fetch = savedFetch;
}
