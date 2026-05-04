/**
 * Configuration Type Guards and Validators
 *
 * Type checking utilities for configuration validation.
 * Uses Zod schemas from @walkeros/core for Flow.Json validation.
 */

import type { Flow } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';

const { safeParseConfig } = schemas;

/**
 * Detect platform from a single flow.
 *
 * Platform is determined by `flow.config.platform`.
 */
export function detectPlatform(
  flow: Record<string, unknown>,
): 'web' | 'server' | undefined {
  const config = flow.config;
  if (!isObject(config)) return undefined;
  const platform = config.platform;
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
  // After successful Zod parse, the data conforms structurally to Flow.Json.
  // The existing `isFlowConfig` guard re-narrows `unknown` to `Flow.Json` via
  // the same schema — TS can't see through `safeParseConfig` because it
  // returns a Zod-inferred type that differs nominally (not structurally)
  // from the Flow.Json interface.
  if (isFlowConfig(data)) return data;

  // Not parseable — format Zod errors for CLI display.
  const result = safeParseConfig(data);
  if (result.success) {
    // Defensive: isFlowConfig and safeParseConfig disagreed (cannot happen).
    throw new Error('Invalid configuration: failed Flow.Json type guard.');
  }
  const errors = result.error.issues
    .map((issue) => {
      const path =
        issue.path.length > 0 ? issue.path.map(String).join('.') : 'root';
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
  throw new Error(`Invalid configuration:\n${errors}`);
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
