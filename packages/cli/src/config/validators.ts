/**
 * Configuration Type Guards and Validators
 *
 * Type checking utilities for configuration validation.
 * Uses Zod schemas from @walkeros/core for Flow.Setup validation.
 */

import type { Flow } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';

const { safeParseSetup } = schemas;

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
 * Type guard: Check if config is a valid Flow.Setup structure.
 *
 * @remarks
 * Uses Zod validation from @walkeros/core.
 * Returns false instead of throwing on invalid input.
 *
 * @example
 * ```typescript
 * if (isFlowSetup(config)) {
 *   const flowConfig = getFlowConfig(config, 'production');
 * }
 * ```
 */
export function isFlowSetup(data: unknown): data is Flow.Setup {
  const result = safeParseSetup(data);
  return result.success;
}

/**
 * Validate Flow.Setup and throw descriptive error if invalid.
 *
 * @remarks
 * Uses Zod validation from @walkeros/core.
 * Provides detailed error messages from Zod.
 *
 * @param data - Raw configuration data
 * @returns Validated Flow.Setup
 * @throws Error with descriptive message if validation fails
 */
export function validateFlowSetup(data: unknown): Flow.Setup {
  const result = safeParseSetup(data);

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

  // Cast to Flow.Setup since Zod's inferred type is compatible but not identical
  return result.data as Flow.Setup;
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
