import type { Mapping } from '@walkeros/core';

/**
 * Type definitions for a server source.
 * Customize for your platform's requirements.
 */

export interface Config {
  mapping?: Mapping.Config;
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
  validateSignature?: boolean;
  apiKeyHeader?: string;
}
