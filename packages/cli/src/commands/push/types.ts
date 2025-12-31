import type { Elb } from '@walkeros/core';

/**
 * Push command options
 */
export interface PushCommandOptions {
  config: string;
  event: string;
  flow?: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
  platform?: 'web' | 'server';
}

/**
 * Push execution result
 */
export interface PushResult {
  success: boolean;
  elbResult?: Elb.PushResult;
  duration: number;
  error?: string;
}
