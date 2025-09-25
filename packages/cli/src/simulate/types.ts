import type { Elb } from '@walkeros/core';

export interface SimulateCommandOptions {
  config: string;
  event?: string;
  json?: boolean;
  verbose?: boolean;
}

export interface SimulationResult {
  success: boolean;
  error?: string;
  collector?: unknown;
  elbResult?: Elb.PushResult;
}
