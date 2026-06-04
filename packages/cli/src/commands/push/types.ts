import type { Elb, Ingest } from '@walkeros/core';

/** Captured network call from polyfilled fetch/sendBeacon during simulation */
export interface NetworkCall {
  type: 'fetch' | 'beacon';
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
}

/**
 * Push execution result
 */
export interface PushResult {
  success: boolean;
  elbResult?: Elb.PushResult;
  /** Network calls captured during web simulation (fetch + sendBeacon) */
  networkCalls?: NetworkCall[];
  duration: number;
  error?: string;
}
