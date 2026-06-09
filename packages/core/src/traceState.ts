/**
 * Shared server-runtime holder for the active `traceUntil` value.
 *
 * The server trace-poller writes via `setTraceUntil`; the per-emit telemetry
 * supplier reads via `getTraceUntil` and passes the result to
 * `resolveTelemetryOptions`. The browser bundle does NOT use this module: it
 * keeps its own `traceUntil` variable inside its IIFE. Only
 * `resolveTelemetryOptions` is shared across platforms.
 */
let value: string | null = null;

export function getTraceUntil(): string | null {
  return value;
}

export function setTraceUntil(v: string | null): void {
  value = v;
}
