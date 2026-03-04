import type { WalkerOS } from '.';

/**
 * Per-step log entry from flow simulation.
 * Captures what happened at each step during a simulateFlow() run.
 */
export interface StepLog {
  /** Step identifier: "source.dataLayer", "destination.ga4", "transformer.validator" */
  step: string;
  /** Outcome of this step */
  status: 'processed' | 'blocked' | 'queued' | 'filtered';
  /** What arrived at this step */
  in?: unknown;
  /** What left this step (undefined if blocked/filtered) */
  out?: unknown;
  /** Processing time in ms */
  duration: number;
}

/**
 * Collector state snapshot for simulation.
 * Passed into simulateFlow() and returned with updates.
 */
export interface FlowState {
  consent?: WalkerOS.Consent;
  user?: WalkerOS.User;
  globals?: WalkerOS.Properties;
  custom?: WalkerOS.Properties;
  allowed?: boolean;
}

/**
 * Parameters for flow-level simulation.
 */
export interface SimulateFlowParams {
  /** Full flow config (sources, destinations, transformers, etc.) */
  config: Record<string, unknown>;
  /** Target step to input into: "source.dataLayer", "source.cmp" */
  step: string;
  /** Step-specific input (agnostic: consent obj, event array, HTML, etc.) */
  input: unknown;
  /** Prior accumulated collector state */
  state?: FlowState;
  /** Real-time per-step callback */
  onStep?: (log: StepLog) => void;
}

/**
 * Result of flow-level simulation.
 */
export interface SimulateFlowResult {
  /** What happened at each step */
  stepLogs: StepLog[];
  /** Updated collector state after this run */
  state: FlowState;
}
