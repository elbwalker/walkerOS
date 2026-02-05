import type { WalkerOS } from '@walkeros/core';

/**
 * Type definitions for a server source.
 * Customize for your platform's requirements.
 */

export interface Config {
  mapping?: WalkerOS.Mapping;
  eventNameMap?: Record<string, string>;
}

export interface Input {
  event: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: number;
}

export interface BatchInput {
  batch: Input[];
}

export interface Settings {
  // Add source-specific settings
  validateSignature?: boolean;
  apiKeyHeader?: string;
}
