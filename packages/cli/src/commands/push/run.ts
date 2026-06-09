import {
  push,
  simulateCollector,
  simulateDestination,
  simulateSource,
  simulateTransformer,
} from './index.js';
import { dispatchSimulate } from './dispatch-simulate.js';
import {
  getErrorMessage,
  isStdinPiped,
  readStdinToTempFile,
  type Platform,
} from '../../core/index.js';
import { loadJsonFromSource } from '../../config/index.js';
import type { Simulation, WalkerOS } from '@walkeros/core';
import type { PushCommandOptions, PushResult } from './types.js';

/**
 * Adapt a step `Simulation.Result` into the CLI's `PushResult` envelope. The
 * `walkeros push --simulate` command path formats and exits on a `PushResult`;
 * the programmatic simulate functions return the unified `Simulation.Result`.
 * This boundary keeps the command behavior identical while the functions
 * expose the richer shape to library consumers.
 */
function simulationToPushResult(result: Simulation.Result): PushResult {
  return {
    success: !result.error,
    duration: result.duration,
    ...(result.error ? { error: result.error.message } : {}),
  };
}

/**
 * Pure variant of `pushCommand` — produces a `PushResult` and never calls
 * `process.exit` or writes to stdout. The CLI wrapper in `index.ts` adds
 * formatting and exit codes on top.
 *
 * Validates `--simulate` flags upfront via `dispatchSimulate` so a malformed
 * flag fails fast (no wasted bundle). Routes to the correct typed function:
 * - `none` → `push()`
 * - `source` → `simulateSource()` (single id; multi rejected by dispatcher)
 * - `transformer` → `simulateTransformer()` (single id)
 * - `destination` → `runDestinationSimulationLoop()` (multi-target loop)
 */
export async function runPushCommand(
  options: PushCommandOptions,
): Promise<PushResult> {
  const startTime = Date.now();

  try {
    // 1. Validate --simulate flags FIRST. Fail fast before bundling/IO.
    const plan = dispatchSimulate(options.simulate ?? []);

    // 2. Resolve config: stdin > argument > default (preserves prior behavior).
    let config: string;
    if (isStdinPiped() && !options.config) {
      config = await readStdinToTempFile('push');
    } else {
      config = options.config || 'bundle.config.json';
    }

    // 3. Resolve string event inputs (path/URL → JSON).
    let resolvedEvent: unknown = options.event;
    if (typeof options.event === 'string') {
      resolvedEvent = await loadJsonFromSource(options.event, {
        name: 'event',
      });
    }

    // 4. Route to the correct typed function based on the plan.
    let result: PushResult;
    switch (plan.kind) {
      case 'none':
        result = await push(config, resolvedEvent, {
          flow: options.flow,
          json: options.json,
          verbose: options.verbose,
          silent: options.silent,
          platform: options.platform as Platform | undefined,
          mock: options.mock,
          snapshot: options.snapshot,
        });
        break;

      case 'source':
        result = simulationToPushResult(
          await simulateSource(config, resolvedEvent, {
            sourceId: plan.ids[0],
            flow: options.flow,
            silent: options.silent,
            verbose: options.verbose,
            snapshot: options.snapshot,
          }),
        );
        break;

      case 'transformer':
        result = simulationToPushResult(
          await simulateTransformer(
            config,
            resolvedEvent as WalkerOS.DeepPartialEvent,
            {
              transformerId: plan.ids[0],
              flow: options.flow,
              mock: options.mock,
              ingest: options.ingest,
              silent: options.silent,
              verbose: options.verbose,
              snapshot: options.snapshot,
            },
          ),
        );
        break;

      case 'collector':
        result = simulationToPushResult(
          await simulateCollector(
            config,
            resolvedEvent as WalkerOS.DeepPartialEvent,
            {
              collectorName: plan.ids[0],
              flow: options.flow,
              silent: options.silent,
              verbose: options.verbose,
              snapshot: options.snapshot,
            },
          ),
        );
        break;

      case 'destination':
        result = await runDestinationSimulationLoop(
          config,
          resolvedEvent as WalkerOS.DeepPartialEvent,
          plan.ids,
          options,
        );
        break;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Run `simulateDestination` once per destination id and aggregate into a
 * single `PushResult`. Stops on the first failure and returns a structured
 * error referencing the failed id.
 */
async function runDestinationSimulationLoop(
  config: string,
  event: WalkerOS.DeepPartialEvent,
  destinationIds: string[],
  options: PushCommandOptions,
): Promise<PushResult> {
  const startTime = Date.now();

  for (const destinationId of destinationIds) {
    const r = await simulateDestination(config, event, {
      destinationId,
      flow: options.flow,
      mock: options.mock,
      silent: options.silent,
      verbose: options.verbose,
      snapshot: options.snapshot,
    });
    if (r.error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: `simulate destination.${destinationId}: ${r.error.message}`,
      };
    }
  }

  return {
    success: true,
    duration: Date.now() - startTime,
  };
}
