import type { Source, WalkerOS, On } from '@walkeros/core';
import type { Scope, Types, Env } from './types';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
  BrowserPush,
  BrowserArguments,
} from './types/elb';
import { isString } from '@walkeros/core';
import { createPushResult } from '@walkeros/collector';
import {
  initTriggers,
  initScopeTrigger,
  processLoadTriggers,
  ready,
  destroyTriggers,
} from './trigger';
import { initElbLayer, drainNonWalkerEvents } from './elbLayer';
import { translateToCoreCollector } from './translation';
import { getPageViewData } from './walker';
import { getConfig } from './config';

export * as SourceBrowser from './types';

/**
 * Window-scoped single-instance sentinel. The browser source must be
 * single-instance per window: one elbLayer adoption, one set of DOM
 * listeners, one `window.elb`. A second/synchronous load of the tag on the
 * same page is a SEPARATE module instance, so a module-scoped counter cannot
 * see it (each load starts at 0). The marker therefore lives on the window
 * itself. A Symbol key avoids collision with page globals and is
 * non-enumerable by nature.
 */
const SINGLE_INSTANCE_KEY = Symbol.for('@walkeros/web-source-browser:instance');

type EnvWindow = Window & typeof globalThis;

function resolveGuardWindow(
  envWindow: EnvWindow | undefined,
): EnvWindow | undefined {
  return (
    envWindow ||
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined)
  );
}

/** For tests only. Clears the window-scoped single-instance sentinel. */
export function __resetInstanceCountForTests(): void {
  const win = resolveGuardWindow(undefined);
  if (win) Reflect.deleteProperty(win, SINGLE_INSTANCE_KEY);
}

/**
 * Inert source instance returned on a second load within the same window.
 * It satisfies the `Source.Instance` contract but performs no side effects:
 * `init` does not adopt elbLayer or bind DOM triggers, `push` resolves to a
 * successful no-op result, and `on`/`destroy` do nothing. This keeps a double
 * load from re-adopting `window.elbLayer` (the production crash vector)
 * without surfacing an error to the host page.
 */
function createInertInstance(): Source.Instance<Types> {
  const fullConfig: Source.Config<Types> = {
    settings: getConfig({}, undefined),
  };
  const push: BrowserPush = ((..._args: Parameters<BrowserArguments>) =>
    Promise.resolve(createPushResult({ ok: true }))) satisfies BrowserPush;
  return {
    type: 'browser',
    config: fullConfig,
    push,
    on: async () => {},
    init: async () => {},
    destroy: async () => {},
  };
}

// Export walker utility functions
export {
  getAllEvents,
  getEvents,
  getGlobals,
  getElbAttributeName,
  getElbValues,
} from './walker';

// Export tagger functionality
export { createTagger } from './tagger';
export type { TaggerConfig, TaggerInstance } from './tagger';

/**
 * Browser source implementation using environment injection.
 *
 * The factory body is side-effect-free: it constructs the Instance and
 * captures closure state. All eager setup (elbLayer drain, DOM listeners,
 * `window.elb` assignment) lives in the `init` lifecycle method, which
 * the collector calls after every source factory has registered. The
 * collector strictly gates `on()` delivery: lifecycle events are queued
 * in `instance.queueOn` until the source is started.
 */
export const sourceBrowser: Source.Init<Types> = async (context) => {
  const { config, env, logger } = context;
  const { elb, command, window, document } = env;

  const userSettings = config?.settings || {};
  const actualWindow =
    window ||
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined);
  const actualDocument =
    document ||
    (typeof globalThis.document !== 'undefined'
      ? globalThis.document
      : undefined);

  // Single-instance per window. A second load on the same page is a separate
  // module instance, so the marker lives on the window, not in module scope.
  // Window-less environments (SSR/node/test without a window) are not guarded.
  const guardWindow = resolveGuardWindow(actualWindow);
  if (guardWindow) {
    if (Reflect.get(guardWindow, SINGLE_INSTANCE_KEY))
      return createInertInstance();
    // Set before init() runs so a synchronous second load is caught before
    // this first instance performs its own factory/init side effects.
    Object.defineProperty(guardWindow, SINGLE_INSTANCE_KEY, {
      value: true,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  }

  const settings: Source.Settings<Types> = getConfig(
    userSettings,
    actualDocument as Document | undefined,
  );

  const fullConfig: Source.Config<Types> = {
    settings,
  };

  const translationContext = {
    elb,
    settings,
    initScope: initScopeTrigger,
  };

  // Helper to send pageview event if enabled
  const sendPageview = (s: Source.Settings<Types>) => {
    if (!s.pageview) return;
    const [data, contextData] = getPageViewData(
      s.prefix || 'data-elb',
      s.scope as Scope,
    );
    translateToCoreCollector(
      translationContext,
      'page view',
      data,
      'load',
      contextData,
    );
  };

  // Lifecycle method — eager. The collector calls this AFTER all source
  // factories have registered. Side effects allowed: drains walker
  // commands from window.elbLayer, sets up DOM listeners, overrides
  // elbLayer.push for live captures.
  const init = async () => {
    if (!actualWindow || !actualDocument) return;

    if (settings.elbLayer !== false && elb) {
      initElbLayer(elb, {
        name: isString(settings.elbLayer) ? settings.elbLayer : 'elbLayer',
        prefix: settings.prefix,
        window: actualWindow as Window,
        logger,
      });
    }

    // Setup global triggers (click, submit) when DOM is ready
    await ready(initTriggers, translationContext, settings);

    // Set up automatic window.elb assignment if configured
    if (isString(settings.elb) && settings.elb) {
      (actualWindow as unknown as Record<string, unknown>)[settings.elb] = (
        ...args: unknown[]
      ) => {
        const [event, data, options, context, nested, custom] = args;
        return translateToCoreCollector(
          translationContext,
          event,
          data as BrowserPushData | undefined,
          options as BrowserPushOptions | undefined,
          context as BrowserPushContext | undefined,
          nested as WalkerOS.Entities,
          custom as WalkerOS.Properties,
        );
      };
    }
  };

  // Lifecycle handler — fired by the collector only when this source is
  // started (config.init=true AND config.require empty). Pre-start events
  // are buffered in instance.queueOn by the collector and replayed on start.
  const handleEvent = async (event: On.Types) => {
    switch (event) {
      case 'run':
        if (actualDocument && actualWindow) {
          processLoadTriggers(translationContext, settings);
          drainNonWalkerEvents(elb, settings, actualWindow as Window, logger);
          sendPageview(settings);
        }
        break;

      default:
        break;
    }
  };

  const push: BrowserPush = ((...args: Parameters<BrowserArguments>) => {
    const [event, data, options, context, nested, custom] = args;
    return translateToCoreCollector(
      translationContext,
      event,
      data,
      options,
      context,
      nested,
      custom,
    );
  }) satisfies BrowserPush;

  // Return stateless source instance with event handler and push method
  return {
    type: 'browser',
    config: fullConfig,
    push,
    on: handleEvent,
    init,
    destroy: async () => {
      // Iterates the scope registry: aborts root + per-scope listeners, clears
      // every scope's intervals/timeouts, and disconnects the shared
      // per-document observer(s). Reaches sub-scopes from `walker init <el>`,
      // not just the source's own document scope.
      destroyTriggers(settings);
    },
  };
};

export default sourceBrowser;
