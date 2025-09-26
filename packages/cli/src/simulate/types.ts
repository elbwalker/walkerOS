import type { Elb } from '@walkeros/core';
import type { ApiCall } from './api-tracker';

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
  logs?: unknown[];
  usage?: Record<string, ApiCall[]>;
  duration?: number;
}
