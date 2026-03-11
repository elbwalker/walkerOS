/**
 * Configuration Type Guards and Validators
 *
 * Type checking utilities for configuration validation.
 * Uses Zod schemas from @walkeros/core for Flow.Config validation.
 */

import type { Flow } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';

const { safeParseConfig } = schemas;

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
 * Type guard: Check if config is a valid Flow.Config structure.
 *
 * @remarks
 * Uses Zod validation from @walkeros/core.
 * Returns false instead of throwing on invalid input.
 *
 * @example
 * ```typescript
 * if (isFlowConfig(config)) {
 *   const flowSettings = getFlowSettings(config, 'production');
 * }
 * ```
 */
export function isFlowConfig(data: unknown): data is Flow.Config {
  const result = safeParseConfig(data);
  return result.success;
}

/**
 * Validate Flow.Config and throw descriptive error if invalid.
 *
 * @remarks
 * Uses Zod validation from @walkeros/core.
 * Provides detailed error messages from Zod.
 *
 * @param data - Raw configuration data
 * @returns Validated Flow.Config
 * @throws Error with descriptive message if validation fails
 */
export function validateFlowConfig(data: unknown): Flow.Config {
  const result = safeParseConfig(data);

  if (!result.success) {
    // Format Zod errors for CLI display
    const errors = result.error.issues
      .map((issue) => {
        const path =
          issue.path.length > 0 ? issue.path.map(String).join('.') : 'root';
        return `  - ${path}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(`Invalid configuration:\n${errors}`);
  }

  // Cast to Flow.Config since Zod's inferred type is compatible but not identical
  return result.data as Flow.Config;
}

/**
 * Get available flow names from a Flow.Config.
 *
 * @param config - Flow.Config configuration
 * @returns Array of flow names
 */
export function getAvailableFlows(config: Flow.Config): string[] {
  return Object.keys(config.flows);
}
