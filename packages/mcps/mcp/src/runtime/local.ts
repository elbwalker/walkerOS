import * as fs from 'fs';
import * as path from 'path';
import {
  collectKnownSecrets,
  loadConfig,
  loadJsonConfig,
  bundle,
  push,
  simulateSource,
  simulateTransformer,
  simulateCollector,
  simulateDestination,
} from '@walkeros/cli';
import { isObject } from '@walkeros/core';
import { isFlowJson } from '../tools/narrow.js';
import type { Flow, WalkerOS } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
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

    baseDir(input) {
      const file = path.resolve(input);
      return fs.existsSync(file) && fs.statSync(file).isFile()
        ? path.dirname(file)
        : undefined;
    },

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
      const config = opts.config ?? input;

      switch (opts.stepType) {
        case 'source':
          return simulateSource(config, opts.event, {
            sourceId: opts.stepId,
            ...common,
            consent: opts.state?.consent,
          });
        case 'transformer':
          return simulateTransformer(config, partialEvent(opts.event), {
            transformerId: opts.stepId,
            ...common,
            ingest: opts.ingest,
            consent: opts.state?.consent,
          });
        case 'collector':
          return simulateCollector(config, partialEvent(opts.event), {
            collectorName: opts.stepId,
            ...common,
            state: opts.state,
            ingest: opts.ingest,
          });
        case 'destination':
          return simulateDestination(config, eventObject(opts.event), {
            destinationId: opts.stepId,
            ...common,
            ingest: opts.ingest,
            consent: opts.state?.consent,
            command: opts.command,
          });
      }
    },

    knownSecrets: async (input) =>
      collectKnownSecrets(await loadJsonConfig<Flow.Json>(input)),

    async loadRun(input) {
      // One read, detected the way push detects its input: content that
      // parses as JSON is a config, anything else a prebuilt bundle, which
      // carries no config and so no secrets to resolve.
      const content = await loadConfig(input, { json: false });
      const config =
        typeof content === 'string' ? parseJson(content) : undefined;
      if (!isFlowJson(config)) return { knownSecrets: [] };
      return { config, knownSecrets: collectKnownSecrets(config) };
    },

    push: (input, event, opts) =>
      push(input, event, {
        json: true,
        flow: opts.flow,
        platform: opts.platform,
        ...(opts.config !== undefined && { raw: opts.config }),
      }),
  };
}

/**
 * The event a transformer or collector step runs on, checked against the
 * partial event schema the CLI applies. The value passes through as given.
 */
function partialEvent(value: unknown): WalkerOS.DeepPartialEvent {
  if (isPartialEvent(value)) return value;
  const parsed = schemas.PartialEventSchema.safeParse(value);
  throw new Error(parsed.error?.message ?? 'Invalid event');
}

function isPartialEvent(value: unknown): value is WalkerOS.DeepPartialEvent {
  return schemas.PartialEventSchema.safeParse(value).success;
}

/** A destination step's event, or a command's data: an object. */
function eventObject(value: unknown): Record<string, unknown> {
  if (isObject(value)) return value;
  throw new Error('event must be an object.');
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}
