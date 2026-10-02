import type { Elb, Flow, Ingest, Simulation, WalkerOS } from '@walkeros/core';

/** A network call a web run (push or simulate) recorded instead of sending (fetch, sendBeacon, XHR) */
export interface NetworkCall {
  type: 'fetch' | 'beacon' | 'xhr';
  url: string;
  method?: string;
  body?: string | null;
  headers?: Record<string, string>;
  timestamp: number;
}

/**
 * Push command options
 */
export interface PushCommandOptions {
  config?: string;
  event: string;
  output?: string;
  flow?: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
  platform?: 'web' | 'server';
  simulate?: string[];
  mock?: string[];
  snapshot?: string;
  /**
   * Pipeline context a simulated transformer reads via `ctx.ingest` (e.g. a
   * request decoder reads `ingest.url`). Forwarded to `simulateTransformer`.
   */
  ingest?: Omit<Ingest, '_meta'>;
  /**
   * Raw `--ingest` flag value (JSON string, file path or URL). Loaded as a
   * JSON object and used as `ingest` for transformer, collector and
   * destination simulation.
   */
  ingestSource?: string;
  /**
   * The collector's starting consent for a simulated transformer, collector
   * or destination. Forwarded as `consent` (collector: `state.consent`).
   */
  consent?: WalkerOS.Consent;
  /**
   * Raw `--consent` flag value (JSON string, file path or URL). Loaded as an
   * object of booleans and used as `consent`.
   */
  consentSource?: string;
  /**
   * `--command`: a simulated destination runs `collector.command(command,
   * event)` instead of pushing the event (step examples with `command`).
   */
  command?: Flow.StepCommand;
  /** `--page-url`: the page URL of a simulated web source. */
  pageUrl?: string;
}

/**
 * Push execution result
 */
export interface PushResult {
  success: boolean;
  elbResult?: Elb.PushResult;
  /** Network calls a web run (push or simulate) recorded instead of sending (fetch, sendBeacon, XHR) */
  networkCalls?: NetworkCall[];
  duration: number;
  error?: string;
  /**
   * One result per simulated step, in order (`--simulate`). A multi
   * destination run stops at the first failure, which is the last entry.
   */
  simulations?: Simulation.Result[];
}
