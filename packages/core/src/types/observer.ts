import type { FlowState } from './telemetry';

/**
 * Pipeline observation channel. Observers receive a FlowState record per
 * step phase (init, in, out, error, skip, flush) and run synchronously in
 * the collector's emit loop. They must not throw; emitStep swallows
 * thrown values defensively so a slow or buggy observer cannot crash the
 * pipeline. Observers must not perform synchronous IO.
 */
export type ObserverFn = (state: FlowState) => void;
