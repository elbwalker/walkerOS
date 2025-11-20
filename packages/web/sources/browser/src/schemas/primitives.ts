import { z } from '@walkeros/core/schemas';

/**
 * Data attribute prefix
 * Used for DOM event tracking
 */
export const DataAttributePrefix = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9-]*$/, 'Must be lowercase kebab-case')
  .describe('Prefix for data attributes on DOM elements');

/**
 * JavaScript variable name
 * Used for global function names
 */
export const JavaScriptVarName = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/, 'Must be a valid JavaScript identifier')
  .describe('JavaScript variable name');

/**
 * DOM scope selector
 * Note: Runtime type is Element | Document (non-serializable)
 */
export const ScopeSelector = z
  .string()
  .describe('DOM scope for event tracking (CSS selector or "document")')
  .optional();
