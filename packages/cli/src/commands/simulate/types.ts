import type { Elb, WalkerOS } from '@walkeros/core';

/** Tracked API call from destination simulation */
export interface ApiCall {
  type: 'call';
  path: string;
  args: unknown[];
  timestamp: number;
}

export interface SimulateCommandOptions {
  config?: string;
  output?: string;
  event?: string;
  flow?: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
  platform?: 'web' | 'server';
  step?: string;
}

export interface SimulationResult {
  success: boolean;
  error?: string;
  collector?: unknown;
  elbResult?: Elb.PushResult;
  logs?: unknown[];
  usage?: Record<string, ApiCall[]>;
  duration?: number;
  /** Events captured by source simulation */
  capturedEvents?: WalkerOS.DeepPartialEvent[];
}
