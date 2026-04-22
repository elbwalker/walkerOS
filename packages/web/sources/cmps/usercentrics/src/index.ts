import type { Source } from '@walkeros/core';
import type { Types, Settings } from './types';
import { setupV2Adapter } from './lib/v2';
import { setupV3Adapter } from './lib/v3';

// Export types for external usage
export * as SourceUsercentrics from './types';

// Export examples
export * from './examples';

/**
 * Usercentrics consent management source for walkerOS.
 *
 * Listens to Usercentrics CMP events and translates consent states to
 * walkerOS consent commands. Supports both the legacy V2 API
 * (`window.UC_UI` + `ucEvent`) and the current V3 API
 * (`window.__ucCmp` + `UC_UI_CMP_EVENT`).
 *
 * @example
 * ```typescript
 * import { sourceUsercentrics } from '@walkeros/web-source-cmp-usercentrics';
 *
 * await startFlow({
 *   sources: {
 *     consent: {
 *       code: sourceUsercentrics,
 *       config: {
 *         settings: {
 *           eventName: 'ucEvent',
 *           categoryMap: {
 *             essential: 'functional',
 *             functional: 'functional',
 *             marketing: 'marketing',
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const sourceUsercentrics: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb, logger } = env;

  // Resolve window with fallback to globalThis
  const actualWindow =
    env.window ??
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined);

  // Merge user settings with defaults so adapters always see a fully-resolved Settings
  const settings: Settings = {
    eventName: config?.settings?.eventName ?? 'ucEvent',
    categoryMap: config?.settings?.categoryMap ?? {},
    explicitOnly: config?.settings?.explicitOnly ?? true,
    apiVersion: config?.settings?.apiVersion ?? 'auto',
    v3EventName: config?.settings?.v3EventName ?? 'UC_UI_CMP_EVENT',
  };

  const fullConfig: Source.Config<Types> = { settings };
  const cleanups: Array<() => void> = [];

  if (actualWindow) {
    const adapterCtx = { window: actualWindow, elb, settings, logger };
    const apiVersion = settings.apiVersion ?? 'auto';

    if (apiVersion === 'v2') {
      cleanups.push(setupV2Adapter(adapterCtx));
    } else if (apiVersion === 'v3') {
      cleanups.push(await setupV3Adapter(adapterCtx));
    } else {
      // auto: detect which API is present
      if (actualWindow.__ucCmp) {
        cleanups.push(await setupV3Adapter(adapterCtx));
      } else if (actualWindow.UC_UI) {
        cleanups.push(setupV2Adapter(adapterCtx));
      } else {
        // Neither loaded yet — attach both listeners so whichever loads later is caught.
        cleanups.push(setupV2Adapter(adapterCtx));
        cleanups.push(await setupV3Adapter(adapterCtx));
      }
    }
  }

  return {
    type: 'usercentrics',
    config: fullConfig,
    push: elb,
    destroy: async () => {
      cleanups.forEach((fn) => fn());
    },
  };
};

export default sourceUsercentrics;
