import { z } from '@walkeros/core/dev';

/**
 * JavaScript variable name
 * Used for dataLayer variable naming
 */
export const JavaScriptVarName = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/, 'Must be a valid JavaScript identifier')
  .describe('JavaScript variable name');

/**
 * Event prefix
 * Used as the entity of every event name the source emits
 */
export const EventPrefix = z
  .string()
  .min(1)
  .describe('Entity of every event name the source emits');
