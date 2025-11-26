/**
 * Configuration Type Guards and Validators
 *
 * Type checking utilities for configuration validation.
 */

import type { Setup, EnvironmentConfig } from '../types/bundle.js';

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
 * Type guard: Validate platform value.
 */
export function validatePlatform(
  platform: unknown,
): platform is 'web' | 'server' {
  return platform === 'web' || platform === 'server';
}

/**
 * Detect platform from flow config.
 *
 * @remarks
 * Supports both legacy format (platform property) and new format (web/server keys).
 * New format takes precedence.
 */
export function detectPlatform(
  flowConfig: Record<string, unknown>,
): 'web' | 'server' | undefined {
  // New format: web/server keys
  if ('web' in flowConfig && flowConfig.web !== undefined) {
    return 'web';
  }
  if ('server' in flowConfig && flowConfig.server !== undefined) {
    return 'server';
  }
  // Legacy format: platform property
  if ('platform' in flowConfig && validatePlatform(flowConfig.platform)) {
    return flowConfig.platform;
  }
  return undefined;
}

/**
 * Check if flow config has valid platform (new or legacy format).
 */
export function hasValidPlatform(flowConfig: Record<string, unknown>): boolean {
  return detectPlatform(flowConfig) !== undefined;
}

/**
 * Type guard: Check if config is multi-environment format.
 */
export function isMultiEnvConfig(data: unknown): data is Setup {
  return (
    isObject(data) &&
    'version' in data &&
    data.version === 1 &&
    'environments' in data &&
    isObject(data.environments)
  );
}

/**
 * Type guard: Check if config is single-environment format.
 *
 * @remarks
 * Only checks structural shape. Supports both legacy (platform) and new (web/server) formats.
 */
export function isSingleEnvConfig(data: unknown): data is EnvironmentConfig {
  return (
    isObject(data) &&
    'flow' in data &&
    'build' in data &&
    isObject(data.flow) &&
    isObject(data.build) &&
    hasValidPlatform(data.flow as Record<string, unknown>)
  );
}

// Legacy format support removed in v0.3.0
// See docs/MIGRATION.md for migration guide
