import type { Elb } from '@walkeros/core';

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
}

/**
 * Push execution result
 */
export interface PushResult {
  success: boolean;
  elbResult?: Elb.PushResult;
  captured?: Array<{ event: unknown; timestamp: number }>;
  /** Tracked destination API calls keyed by destination ID */
  usage?: Record<string, Array<{ fn: string; args: unknown[]; ts: number }>>;
  duration: number;
  error?: string;
}
