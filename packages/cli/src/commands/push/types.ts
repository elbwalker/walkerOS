import type { Elb } from '@walkeros/core';
import type { GlobalOptions } from '../../types/index.js';

/**
 * Push command options
 */
export interface PushCommandOptions extends GlobalOptions {
  config: string;
  event: string;
  flow?: string;
  json?: boolean;
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
