import type { Source, On } from '@walkeros/core';
import type { Types } from './types';
import { interceptDataLayer, processExistingEvents } from './interceptor';

// Export types for external usage
export * as SourceDataLayer from './types';

/**
 * DataLayer source implementation using environment injection.
 *
 * This source intercepts dataLayer.push calls and transforms them to WalkerOS events.
 * It works by replacing the dataLayer.push method with a custom handler.
 */
export const sourceDataLayer: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  // Events exit via `push` (the collector's source pipeline, so this source's
  // `next`/`before`/mapping/cache/state and status apply); `elb` stays the
  // outward-facing slot on the instance below. This source emits no commands.
  const { elb, push, window: envWindow } = env;

  const settings: Source.Settings<Types> = {
    name: 'dataLayer',
    prefix: 'dataLayer',
    ...config?.settings,
  };

  const fullConfig: Source.Config<Types> = {
    settings,
  };

  // Captured at init time — see init below.
  let pendingReplayCount = 0;

  // Lifecycle setup. Called by the collector eagerly after registration,
  // regardless of `require`. The factory body above is side-effect-free.
  const init = () => {
    if (!envWindow) return;
    const dataLayerName = settings.name || 'dataLayer';
    const dl = (envWindow as Record<string, unknown>)[dataLayerName];
    pendingReplayCount = Array.isArray(dl) ? dl.length : 0;

    const win = envWindow as unknown as Record<string, unknown>;
    interceptDataLayer(push, fullConfig, win);
  };

  // Replay pre-existing entries when the run signal lands. The collector
  // strictly gates on() delivery: this fires only when the source is
  // started (`config.init === true` AND `config.require` empty). If a
  // require gate is unmet, the run event is queued in `queueOn` by
  // onApply and replayed when the source becomes started.
  const handleEvent = async (event: On.Types) => {
    if (event === 'run' && envWindow && pendingReplayCount > 0) {
      const win = envWindow as unknown as Record<string, unknown>;
      processExistingEvents(push, fullConfig, pendingReplayCount, win);
      pendingReplayCount = 0;
    }
  };

  return {
    type: 'dataLayer',
    config: fullConfig,
    // Deliberately `elb`, not the pipeline `push`. This slot is the source's
    // outward-facing entry (and what `startFlow` exports as its `elb` when this
    // source is primary), not the capture path: real dataLayer entries arrive
    // through the intercepted `dataLayer.push`, which routes via the pipeline.
    push: elb,
    on: handleEvent,
    init,
    destroy: async () => {
      // Cleanup: restore original dataLayer.push if possible
      const dataLayerName = settings.name || 'dataLayer';
      if (
        envWindow &&
        envWindow[dataLayerName] &&
        Array.isArray(envWindow[dataLayerName])
      ) {
        // Note: Complete restoration would require storing original push method
        // For now, we'll just document this limitation
      }
    },
  };
};

export default sourceDataLayer;
