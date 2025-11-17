import type { Elb } from '@walkeros/core';
import type { GlobalOptions } from '../../types';
import type { ApiCall } from './tracker';

export interface SimulateCommandOptions extends GlobalOptions {
  config: string;
  event?: string;
  json?: boolean;
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
