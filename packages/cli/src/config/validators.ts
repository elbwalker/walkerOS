/**
 * Configuration Type Guards and Validators
 *
 * Type checking utilities for configuration validation.
 * Uses Zod schemas from @walkeros/core for Flow.Json validation.
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
 * Detect platform from a single flow.
 *
 * Platform is determined by `flow.config.platform`.
 */
export function detectPlatform(
  flow: Record<string, unknown>,
): 'web' | 'server' | undefined {
  const config = flow.config;
  if (!config || typeof config !== 'object') return undefined;
  const platform = (config as Record<string, unknown>).platform;
  if (platform === 'web' || platform === 'server') return platform;
  return undefined;
}

/**
 * Type guard: Check if config is a valid Flow.Json structure.
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
export function isFlowConfig(data: unknown): data is Flow.Json {
  const result = safeParseConfig(data);
  return result.success;
}

/**
 * Validate Flow.Json and throw descriptive error if invalid.
 *
 * @remarks
 * Uses Zod validation from @walkeros/core.
 * Provides detailed error messages from Zod.
 *
 * @param data - Raw configuration data
 * @returns Validated Flow.Json
 * @throws Error with descriptive message if validation fails
 */
export function validateFlowConfig(data: unknown): Flow.Json {
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

  // Cast to Flow.Json since Zod's inferred type is compatible but not identical
  return result.data as Flow.Json;
}

/**
 * Get available flow names from a Flow.Json.
 *
 * @param config - Flow.Json configuration
 * @returns Array of flow names
 */
export function getAvailableFlows(config: Flow.Json): string[] {
  return Object.keys(config.flows);
}
