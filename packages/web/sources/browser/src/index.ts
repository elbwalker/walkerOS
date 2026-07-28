import type { Source, On } from '@walkeros/core';
import type { Context, Scope, Types, Env } from './types';
import type { BrowserPush, BrowserArguments } from './types/elb';
import { isString } from '@walkeros/core';
import {
  createRegistry,
  initTriggers,
  initScopeTrigger,
  processLoadTriggers,
  ready,
  destroyTriggers,
} from './trigger';
import type { ElbLayerController } from './elbLayer';
import { createElbLayer } from './elbLayer';
import { translateToCoreCollector } from './translation';
import { getPageViewData, getUser } from './walker';
import { getConfig } from './config';
import { mark, owner, release } from './ownership';

export * as SourceBrowser from './types';

/**
 * @deprecated Does nothing. A source claims its own resources and releases them
 * on destroy, so there is nothing to reset. Removed in the next major.
 */
export function __resetInstanceCountForTests(): void {}

/**
 * @deprecated Does nothing, always undefined. Ownership lives on the resources
 * a source claims. Removed in the next major.
 */
export function __readInstanceGuardForTests(): unknown {
  return undefined;
}

// Export walker utility functions
export {
  getAllEvents,
  getEvents,
  getGlobals,
  getUser,
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

  const settings: Source.Settings<Types> = getConfig(
    userSettings,
    actualDocument as Document | undefined,
  );

  const fullConfig: Source.Config<Types> = {
    settings,
  };

  // One registry per source instance. Every scope-aligned context the
  // translation layer spreads off this one carries the same registry by
  // reference, so `walker run` and `walker init <el>` of this source share
  // element dedup while a second source on the page shares nothing. It is also
  // this source's ownership identity: every mark it sets names this object.
  const registry = createRegistry();
  const translationContext: Context = {
    elb,
    settings,
    registry,
    logger,
    initScope: initScopeTrigger,
  };

  // The append-only elbLayer controller (created in init when elbLayer is
  // enabled) and the window.elb function we install, retained so destroy can
  // tear down exactly what this instance set up.
  let controller: ElbLayerController | undefined;
  let installedWindowElb: BrowserPush | undefined;
  let initialized = false;

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

  // Collect declarative user identity (data-elbuser) from the scope and set it as
  // persistent collector state via the existing `walker user` command. Returns the
  // dispatch promise so the run chain can order it strictly before the pageview,
  // or undefined when no data-elbuser is present (absent = no push, never a wipe).
  const sendUser = (s: Source.Settings<Types>) => {
    const user = getUser(s.prefix || 'data-elb', s.scope as Scope);
    if (!Object.keys(user).length) return;
    return translateToCoreCollector(translationContext, 'walker user', user);
  };

  // Lifecycle method, eager. The collector calls this AFTER all source
  // factories have registered. Side effects allowed: adopts window.elbLayer
  // via the controller, sets up DOM listeners, installs window.elb.
  const init = async () => {
    if (!actualWindow || !actualDocument) return;
    // The collector calls init once; a second call would re-adopt resources
    // this source already holds.
    if (initialized) return;
    initialized = true;

    // Build the append-only layer controller. It routes through the real
    // translationContext, so `walker init` reaches initScope and events flow
    // through the same funnel as direct window.elb calls.
    const layerName = isString(settings.elbLayer)
      ? settings.elbLayer
      : 'elbLayer';
    const activeController =
      settings.elbLayer !== false
        ? createElbLayer(translationContext, {
            name: layerName,
            window: actualWindow,
            logger,
          })
        : undefined;

    // A layer another source adopted hands back an inert controller: it has no
    // shared FIFO tail, so keeping it would drop `walker user` out of order
    // ahead of the pageview. Dropping it routes the run through the awaited
    // path instead, and sends window.elb straight to this source's push.
    const adoptedLayer: unknown = Reflect.get(actualWindow, layerName);
    const adoptedController =
      activeController && owner(adoptedLayer) === registry
        ? activeController
        : undefined;
    controller = adoptedController;

    // Setup global triggers (click, submit) when DOM is ready
    await ready(initTriggers, translationContext, settings);

    // Single writer for window.elb, and only when no other source installed
    // one: overwriting it would cut the page's calls off from the source that
    // owns the rest of the page. An unmarked function is the page's own
    // pre-load stub and is replaced, as it always has been. `elb: false` takes
    // no name at all, which is how an embedded source runs with no page-window
    // footprint.
    // Settings reach here unparsed, so the name is probed rather than trusted:
    // any value outside `string | false` installs nothing instead of claiming a
    // window property named after it.
    // `adoptedController` is a const so its truthy narrowing survives into the
    // arrow closure, the `let controller` field would widen back to
    // `| undefined` and force a cast.
    if (isString(settings.elb) && settings.elb) {
      const existingElb: unknown = Reflect.get(actualWindow, settings.elb);
      const elbOwner = owner(existingElb);
      if (elbOwner && elbOwner !== registry) {
        logger?.error(
          `elb "${settings.elb}" is already installed by another source`,
        );
      } else {
        const windowElb: BrowserPush = adoptedController
          ? (((...args: Parameters<BrowserArguments>) =>
              adoptedController.intake(args)) satisfies BrowserPush)
          : push;
        installedWindowElb = mark(windowElb, registry);
        Reflect.set(actualWindow, settings.elb, windowElb);
      }
    }
  };

  // Lifecycle handler, fired by the collector only when this source is
  // started (config.init=true AND config.require empty). Pre-start events
  // are buffered in instance.queueOn by the collector and replayed on start.
  const handleEvent = async (event: On.Types) => {
    switch (event) {
      case 'run':
        // A torn-down source scans nothing and emits nothing. The collector
        // keeps it reachable after destroy, and a page that fires `walker run`
        // per route change keeps calling it.
        if (actualDocument && actualWindow && !registry.destroyed) {
          processLoadTriggers(translationContext, settings);
          if (controller) {
            // Replay the recorded backlog, then set the user, then the pageview, on
            // one FIFO chain so the pageview (and every later event) carries the user.
            controller.start();
            // Fire-and-forget: the enqueue link is now rejectable, so swallow
            // its rejection here to avoid an unhandled-rejection warning.
            controller.enqueue(() => sendUser(settings)).catch(() => {});
            controller.enqueue(() => sendPageview(settings)).catch(() => {});
          } else {
            // No controller: await the user command so collector.user is set before
            // the pageview's enrichment reads it. `sendUser` returns undefined when
            // no data-elbuser is present, so this is a no-op await in that case.
            await sendUser(settings);
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
      // Iterates this source's registry: aborts its root + per-scope listeners,
      // clears every scope's intervals/timeouts, and disconnects its
      // per-document observer(s). Reaches sub-scopes from `walker init <el>`,
      // not just the source's own document scope.
      destroyTriggers(translationContext);

      // Restore the layer's native push and forget controller state.
      controller?.destroy();

      // Remove window.elb only if it is still the function we installed, never
      // clobber a foreign global. The writer hands its mark back either way, so
      // a page that kept a reference to it does not keep the name held.
      if (actualWindow && isString(settings.elb) && settings.elb) {
        if (Reflect.get(actualWindow, settings.elb) === installedWindowElb)
          Reflect.deleteProperty(actualWindow, settings.elb);
      }
      if (installedWindowElb) release(installedWindowElb);

      // Drop references so a stray post-destroy run finds nothing to drive.
      controller = undefined;
      installedWindowElb = undefined;
    },
  };
};

export default sourceBrowser;
