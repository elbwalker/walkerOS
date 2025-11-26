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
 * - flows: object with at least one flow
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
  if (!('flows' in data) || !isObject(data.flows)) return false;

  // Must have at least one flow
  const flowKeys = Object.keys(data.flows);
  if (flowKeys.length === 0) return false;

  // Each flow must be a valid Flow.Config (has web or server key)
  for (const key of flowKeys) {
    const flow = (data.flows as Record<string, unknown>)[key];
    if (!isObject(flow)) return false;
    if (!hasValidPlatform(flow)) return false;
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
        `Expected: { "version": 1, "flows": { ... } }`,
    );
  }

  if (!('flows' in data) || !isObject(data.flows)) {
    throw new Error(
      `Invalid configuration: missing or invalid "flows" field.\n` +
        `Expected: { "version": 1, "flows": { "default": { web: {}, ... } } }`,
    );
  }

  const flowKeys = Object.keys(data.flows);
  if (flowKeys.length === 0) {
    throw new Error(
      `Invalid configuration: "flows" must contain at least one flow.\n` +
        `Example: { "version": 1, "flows": { "default": { web: {}, ... } } }`,
    );
  }

  // Validate each flow
  for (const key of flowKeys) {
    const flow = (data.flows as Record<string, unknown>)[key];
    if (!isObject(flow)) {
      throw new Error(
        `Invalid configuration: flow "${key}" must be an object.`,
      );
    }
    if (!hasValidPlatform(flow)) {
      throw new Error(
        `Invalid configuration: flow "${key}" must have a "web" or "server" key.\n` +
          `Example: { "web": {}, "destinations": { ... } }`,
      );
    }
  }

  return data as unknown as Flow.Setup;
}

/**
 * Get available flow names from a Flow.Setup.
 *
 * @param setup - Flow.Setup configuration
 * @returns Array of flow names
 */
export function getAvailableFlows(setup: Flow.Setup): string[] {
  return Object.keys(setup.flows);
}
