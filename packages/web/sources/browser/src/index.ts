import type { Source, On } from '@walkeros/core';
import type { Scope, Types, Env } from './types';
import type { BrowserPush, BrowserArguments } from './types/elb';
import { isString } from '@walkeros/core';
import { createPushResult } from '@walkeros/collector';
import {
  initTriggers,
  initScopeTrigger,
  processLoadTriggers,
  ready,
  destroyTriggers,
} from './trigger';
import type { ElbLayerController } from './elbLayer';
import { createElbLayer } from './elbLayer';
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

/** For tests only. Reads the window-scoped single-instance sentinel so tests
 * assert against the real key, not a copied string. */
export function __readInstanceGuardForTests(): unknown {
  const win = resolveGuardWindow(undefined);
  return win ? Reflect.get(win, SINGLE_INSTANCE_KEY) : undefined;
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

  // The append-only elbLayer controller (created in init when elbLayer is
  // enabled) and the window.elb function we install, retained so destroy can
  // tear down exactly what this instance set up.
  let controller: ElbLayerController | undefined;
  let installedWindowElb: BrowserPush | undefined;

  // Helper to send pageview event if enabled. Returns the dispatch promise so
  // the enqueued run-chain link resolves when the pageview actually completes.
  const sendPageview = (s: Source.Settings<Types>) => {
    if (!s.pageview) return;
    const [data, contextData] = getPageViewData(
      s.prefix || 'data-elb',
      s.scope as Scope,
    );
    return translateToCoreCollector(
      translationContext,
      'page view',
      data,
      'load',
      contextData,
    );
  };

  // Lifecycle method — eager. The collector calls this AFTER all source
  // factories have registered. Side effects allowed: adopts window.elbLayer
  // via the controller, sets up DOM listeners, installs window.elb.
  const init = async () => {
    if (!actualWindow || !actualDocument) return;

    // Build the append-only layer controller. It routes through the real
    // translationContext, so `walker init` reaches initScope and events flow
    // through the same funnel as direct window.elb calls.
    const activeController =
      settings.elbLayer !== false
        ? createElbLayer(translationContext, {
            name: isString(settings.elbLayer) ? settings.elbLayer : 'elbLayer',
            window: actualWindow,
            logger,
          })
        : undefined;
    controller = activeController;

    // Setup global triggers (click, submit) when DOM is ready
    await ready(initTriggers, translationContext, settings);

    // Single writer for window.elb. With a controller, calls append to the
    // layer and route through the shared chain; without one (elbLayer:false)
    // they route directly via the source's push. `activeController` is a const
    // so its truthy narrowing survives into the arrow closure — the `let
    // controller` field would widen back to `| undefined` and force a cast.
    if (isString(settings.elb) && settings.elb) {
      const windowElb: BrowserPush = activeController
        ? (((...args: Parameters<BrowserArguments>) =>
            activeController.intake(args)) satisfies BrowserPush)
        : push;
      installedWindowElb = windowElb;
      Reflect.set(actualWindow, settings.elb, windowElb);
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
          if (controller) {
            // Replay the recorded backlog, then the pageview, on one chain so
            // the pageview lands after any queued events. Fire-and-forget: run
            // may arrive from inside a chain item, so awaiting would deadlock.
            controller.start();
            // Fire-and-forget: the enqueue link is now rejectable, so swallow
            // its rejection here to avoid an unhandled-rejection warning.
            controller.enqueue(() => sendPageview(settings)).catch(() => {});
          } else {
            sendPageview(settings);
          }
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

      // Restore the layer's native push and forget controller state.
      controller?.destroy();

      // Remove window.elb only if it is still the function we installed — never
      // clobber a foreign global.
      if (actualWindow && isString(settings.elb) && settings.elb) {
        if (Reflect.get(actualWindow, settings.elb) === installedWindowElb)
          Reflect.deleteProperty(actualWindow, settings.elb);
      }

      // Clear the single-instance sentinel so a destroyed source can be
      // recreated on the same window.
      if (guardWindow) Reflect.deleteProperty(guardWindow, SINGLE_INSTANCE_KEY);

      // Drop references so a stray post-destroy run finds nothing to drive.
      controller = undefined;
      installedWindowElb = undefined;
    },
  };
};

export default sourceBrowser;
