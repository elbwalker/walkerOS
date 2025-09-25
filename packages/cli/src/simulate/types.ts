import type { WalkerOS } from '@walkeros/core';

export interface SimulateCommandOptions {
  config: string;
  event?: string;
  json?: boolean;
  verbose?: boolean;
}

export interface ApiCall {
  path: string;
  args: unknown[];
  timestamp: number;
  source?: 'env-injection' | 'window-proxy' | 'window-proxy-set';
}

export interface SimulationResult {
  event: WalkerOS.Event;
  calls: ApiCall[];
  success: boolean;
  error?: string;
  duration: number;
  collectorData?: {
    queue: unknown[];
    queueLength: number;
    destinations: unknown[];
    allowed?: unknown;
    consent?: unknown;
    count?: unknown;
  };
  elbResult?: {
    ok: boolean;
    successful: unknown[];
    queued: unknown[];
    failed: unknown[];
    event: WalkerOS.Event;
  };
  setupData?: {
    hasElb: boolean;
    status: string;
    error?: string;
  };
}

export interface CaptureEnvironment {
  [key: string]: any;
}

export interface DestinationMeta {
  name: string;
  code: string;
  packageName: string;
  hasExamples: boolean;
}
