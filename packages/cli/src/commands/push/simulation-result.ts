import type { Simulation, WalkerOS } from '@walkeros/core';
import { getErrorMessage } from '../../core/utils.js';

/**
 * Captured event entry produced by the simulate functions. The event may be
 * `null`/`undefined` when a transformer drops the event; those entries are
 * filtered out of the final `events` array.
 */
interface CapturedEntry {
  event: WalkerOS.DeepPartialEvent | null | undefined;
  timestamp: number;
}

/** Tracked env call recorded during destination simulation. */
interface TrackedCall {
  fn: string;
  args: unknown[];
  ts: number;
}

export interface BuildSimulationResultArgs {
  step: Simulation.Result['step'];
  name: string;
  startTime: number;
  captured?: CapturedEntry[];
  usage?: Record<string, TrackedCall[]>;
  /** Entity-action key of the matched mapping rule (destination simulations). */
  mappingKey?: string;
  error?: unknown;
}

/** Type guard that narrows a captured entry to a non-null event. */
function hasEvent(
  entry: CapturedEntry,
): entry is { event: WalkerOS.DeepPartialEvent; timestamp: number } {
  return entry.event != null;
}

/** Normalize an unknown error into an `Error` instance. */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(getErrorMessage(error));
}

/**
 * Assemble a core `Simulation.Result` from the raw outputs of the CLI simulate
 * functions. Pure: maps captured entries to output events (dropping dropped
 * events), flattens per-destination tracked calls into a single `calls` array,
 * and computes the elapsed duration.
 */
export function buildSimulationResult(
  args: BuildSimulationResultArgs,
): Simulation.Result {
  const { step, name, startTime, captured, usage, mappingKey, error } = args;

  const events: WalkerOS.DeepPartialEvent[] = (captured ?? [])
    .filter(hasEvent)
    .map((entry) => entry.event);

  const calls: Simulation.Call[] = usage
    ? Object.values(usage)
        .flat()
        .map((call) => ({ fn: call.fn, args: call.args, ts: call.ts }))
    : [];

  return {
    step,
    name,
    events,
    calls,
    duration: Date.now() - startTime,
    ...(mappingKey !== undefined ? { mappingKey } : {}),
    ...(error !== undefined ? { error: toError(error) } : {}),
  };
}
