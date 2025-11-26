/**
 * Configuration Type Guards and Validators
 *
 * Type checking utilities for configuration validation.
 */

import type { Flow } from '@walkeros/core';

/**
 * Type guard: Check if value is a plain object.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Detect platform from flow config.
 *
 * Platform is determined by the presence of `web` or `server` key.
 */
export function detectPlatform(
  flowConfig: Record<string, unknown>,
): 'web' | 'server' | undefined {
  if ('web' in flowConfig && flowConfig.web !== undefined) {
    return 'web';
  }
  if ('server' in flowConfig && flowConfig.server !== undefined) {
    return 'server';
  }
  return undefined;
}

/**
 * Check if flow config has valid platform.
 */
export function hasValidPlatform(flowConfig: Record<string, unknown>): boolean {
  return detectPlatform(flowConfig) !== undefined;
}

/**
 * Type guard: Check if config is a valid Flow.Setup structure.
 *
 * @remarks
 * Flow.Setup is the only supported config format.
 * It must have:
 * - version: 1
 * - environments: object with at least one environment
 *
 * @example
 * ```typescript
 * if (isFlowSetup(config)) {
 *   const flowConfig = getFlowConfig(config, 'production');
 * }
 * ```
 */
export function isFlowSetup(data: unknown): data is Flow.Setup {
  if (!isObject(data)) return false;
  if (!('version' in data) || data.version !== 1) return false;
  if (!('environments' in data) || !isObject(data.environments)) return false;

  // Must have at least one environment
  const envKeys = Object.keys(data.environments);
  if (envKeys.length === 0) return false;

  // Each environment must be a valid Flow.Config (has web or server key)
  for (const key of envKeys) {
    const env = (data.environments as Record<string, unknown>)[key];
    if (!isObject(env)) return false;
    if (!hasValidPlatform(env)) return false;
  }

  return true;
}

/**
 * Validate Flow.Setup and throw descriptive error if invalid.
 *
 * @param data - Raw configuration data
 * @returns Validated Flow.Setup
 * @throws Error with descriptive message if validation fails
 */
export function validateFlowSetup(data: unknown): Flow.Setup {
  if (!isObject(data)) {
    throw new Error(
      `Invalid configuration: expected object, got ${typeof data}`,
    );
  }

  if (!('version' in data) || data.version !== 1) {
    throw new Error(
      `Invalid configuration: missing or invalid "version" field.\n` +
        `Expected: { "version": 1, "environments": { ... } }`,
    );
  }

  if (!('environments' in data) || !isObject(data.environments)) {
    throw new Error(
      `Invalid configuration: missing or invalid "environments" field.\n` +
        `Expected: { "version": 1, "environments": { "default": { web: {}, ... } } }`,
    );
  }

  const envKeys = Object.keys(data.environments);
  if (envKeys.length === 0) {
    throw new Error(
      `Invalid configuration: "environments" must contain at least one environment.\n` +
        `Example: { "version": 1, "environments": { "default": { web: {}, ... } } }`,
    );
  }

  // Validate each environment
  for (const key of envKeys) {
    const env = (data.environments as Record<string, unknown>)[key];
    if (!isObject(env)) {
      throw new Error(
        `Invalid configuration: environment "${key}" must be an object.`,
      );
    }
    if (!hasValidPlatform(env)) {
      throw new Error(
        `Invalid configuration: environment "${key}" must have a "web" or "server" key.\n` +
          `Example: { "web": {}, "destinations": { ... } }`,
      );
    }
  }

  return data as unknown as Flow.Setup;
}

/**
 * Get available environment names from a Flow.Setup.
 *
 * @param setup - Flow.Setup configuration
 * @returns Array of environment names
 */
export function getAvailableEnvironments(setup: Flow.Setup): string[] {
  return Object.keys(setup.environments);
}
