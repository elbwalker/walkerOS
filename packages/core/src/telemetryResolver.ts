/**
 * Runtime telemetry resolver.
 *
 * Converts a flow-side `Flow.Config.observe` block plus a runtime `traceUntil`
 * override into a concrete `TelemetryOptions` the collector hooks installer can
 * consume. Pure function of its inputs: it reads no environment.
 *
 * Resolution order (highest priority first):
 *   1. `traceUntil`, if a string that parses to a future ISO timestamp ->
 *      force level=trace, sample=1, include in/out payloads.
 *   2. The `observe` block.
 *   3. A tier default of `{ level: 'standard' }`.
 *
 * The `traceUntil` value can flip between emits, so trace turns on and off as
 * the timestamp comes and goes. The platform-specific caller owns the value
 * and supplies it per emit.
 */
import type { TelemetryLevel, TelemetryOptions } from './telemetry';

interface ResolveTelemetryInput {
  flowId: string;
  /** From `flow.config?.observe`. May be undefined. */
  observe?: { level?: 'off' | 'standard' | 'trace'; sample?: number };
  /** Runtime trace override. ISO timestamp parsing to a future time forces trace. */
  traceUntil?: string | null;
  /** Clock seam for tests. Defaults to `Date.now()`. */
  now?: () => number;
}

/**
 * Returns `TelemetryOptions` ready to pass to `createTelemetryObserver`,
 * or `null` if telemetry is disabled (`level === 'off'` with no trace
 * override). Callers should skip observer installation when this returns
 * null.
 */
export function resolveTelemetryOptions(
  input: ResolveTelemetryInput,
): TelemetryOptions | null {
  const now = input.now ?? (() => Date.now());

  const { traceUntil } = input;
  if (typeof traceUntil === 'string' && traceUntil.length > 0) {
    const parsed = Date.parse(traceUntil);
    if (!Number.isNaN(parsed) && parsed > now()) {
      return {
        flowId: input.flowId,
        level: 'trace',
        includeIn: true,
        includeOut: true,
        sample: 1,
      };
    }
  }

  const level: TelemetryLevel = input.observe?.level ?? 'standard';
  if (level === 'off') return null;

  const sample = input.observe?.sample ?? 1;
  return {
    flowId: input.flowId,
    level,
    sample,
  };
}
