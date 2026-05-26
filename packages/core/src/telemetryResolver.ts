/**
 * Runtime telemetry resolver.
 *
 * Converts a flow-side `Flow.Config.observe` block plus a runtime override
 * (the `WALKEROS_TRACE_UNTIL` env var) into a concrete `TelemetryOptions`
 * the collector hooks installer can consume.
 *
 * Resolution order (highest priority first):
 *   1. `WALKEROS_TRACE_UNTIL` env var, if present and parses to a future ISO
 *      timestamp -> force level=trace, sample=1, include in/out payloads.
 *   2. The `observe` block from `flow.config?.observe`.
 *   3. A tier default of `{ level: 'standard' }`.
 *
 * The full poll-and-update plumbing that lets an operator flip
 * `WALKEROS_TRACE_UNTIL` without redeploying the container is intentionally
 * stubbed at the env-var seam: the deployment record's `trace_until` is
 * written by the app, but a sidecar/heartbeat that propagates it into the
 * container is out of scope for this phase. For now an operator sets the
 * env var directly, or the next deploy picks it up at boot.
 */
import type { TelemetryLevel, TelemetryOptions } from './telemetry';

interface ResolveTelemetryInput {
  flowId: string;
  startedAt: number;
  /** From `flow.config?.observe`. May be undefined. */
  observe?: { level?: 'off' | 'standard' | 'trace'; sample?: number };
  /** Snapshot of `process.env` (or any equivalent). Test seam. */
  env?: Record<string, string | undefined>;
  /** Clock seam for tests. Defaults to `Date.now()`. */
  now?: () => number;
}

/**
 * Returns `TelemetryOptions` ready to pass to `createTelemetryHooks`, or
 * `null` if telemetry is disabled (`level === 'off'` with no trace
 * override). Callers should skip hook installation when this returns null.
 */
export function resolveTelemetryOptions(
  input: ResolveTelemetryInput,
): TelemetryOptions | null {
  const env = input.env ?? (typeof process !== 'undefined' ? process.env : {});
  const now = input.now ?? (() => Date.now());

  const traceUntilRaw = env.WALKEROS_TRACE_UNTIL;
  if (typeof traceUntilRaw === 'string' && traceUntilRaw.length > 0) {
    const parsed = Date.parse(traceUntilRaw);
    if (!Number.isNaN(parsed) && parsed > now()) {
      return {
        flowId: input.flowId,
        startedAt: input.startedAt,
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
    startedAt: input.startedAt,
    level,
    sample,
  };
}
