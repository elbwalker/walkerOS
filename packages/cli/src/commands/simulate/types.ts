import type { Elb } from '@walkeros/core';
import type { ApiCall } from './tracker.js';

export interface SimulateCommandOptions {
  config?: string;
  output?: string;
  event?: string;
  flow?: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
  platform?: 'web' | 'server';
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
