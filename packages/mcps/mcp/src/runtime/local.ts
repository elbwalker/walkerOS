import {
  collectKnownSecrets,
  loadJsonConfig,
  bundle,
  push,
  simulateSource,
  simulateTransformer,
  simulateCollector,
  simulateDestination,
} from '@walkeros/cli';
import type { Flow, WalkerOS } from '@walkeros/core';
import { getOrBuildBundle } from './bundle-cache.js';
import type { FlowRuntime } from './types.js';

/**
 * The full-capability runtime for the user's own machine (stdio, the developer
 * CLI). It wraps the `@walkeros/cli` loaders and runners exactly as the tools
 * called them before the runtime seam existed, so local behaviour is unchanged:
 * a config may be a file path, an http(s) URL or inline JSON, and bundling,
 * simulation and push run in this process.
 *
 * This is the only module in the package that may bind those cli functions;
 * the tools reach them through the `FlowRuntime` interface and nothing else.
 */
export function createLocalRuntime(): FlowRuntime {
  return {
    load: (input) => loadJsonConfig(input),

    bundle: (input, opts) =>
      bundle(input, {
        flowName: opts.flowName,
        stats: opts.stats,
        buildOverrides: opts.output ? { output: opts.output } : undefined,
      }),

    async simulate(input, opts) {
      // Reuse a prebuilt bundle across calls with the same resolved config. The
      // simulate fns take their fast `mode: 'prebuilt'` branch when given a
      // bundlePath, skipping the per-call rebuild. On any bundle failure fall
      // back to undefined so the simulate fn rebuilds and surfaces its own error.
      let bundlePath: string | undefined;
      try {
        bundlePath = await getOrBuildBundle(input);
      } catch {
        bundlePath = undefined;
      }
      const common = { bundlePath, flow: opts.flow, silent: true };

      switch (opts.stepType) {
        case 'source':
          return simulateSource(input, opts.event, {
            sourceId: opts.stepId,
            ...common,
            consent: opts.state?.consent,
          });
        case 'transformer':
          return simulateTransformer(
            input,
            opts.event as WalkerOS.DeepPartialEvent,
            {
              transformerId: opts.stepId,
              ...common,
              ingest: opts.ingest,
              consent: opts.state?.consent,
            },
          );
        case 'collector':
          return simulateCollector(
            input,
            opts.event as WalkerOS.DeepPartialEvent,
            {
              collectorName: opts.stepId,
              ...common,
              state: opts.state,
              ingest: opts.ingest,
            },
          );
        case 'destination':
          return simulateDestination(
            input,
            opts.event as WalkerOS.DeepPartialEvent,
            {
              destinationId: opts.stepId,
              ...common,
              ingest: opts.ingest,
              consent: opts.state?.consent,
              command: opts.command,
            },
          );
      }
    },

    knownSecrets: async (input) =>
      collectKnownSecrets(await loadJsonConfig<Flow.Json>(input)),

    push: (input, event, opts) =>
      push(input, event, {
        json: true,
        flow: opts.flow,
        platform: opts.platform,
      }),
  };
}
