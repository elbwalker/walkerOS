import { z } from '@walkeros/core/dev';
import {
  DataAttributePrefix,
  JavaScriptVarName,
  ScopeSelector,
} from './primitives';

/**
 * Session configuration schema
 * Note: Runtime type can be boolean | SessionConfig
 * SessionConfig is non-serializable, so we use z.any() for the complex form
 */
const SessionConfigSchema = z.union([
  z.boolean(),
  z
    .any()
    .describe(
      'SessionConfig object from @walkeros/web-core with tracking settings',
    ),
]);

/**
 * ELB Layer configuration schema
 * Note: Runtime type can be boolean | string | Elb.Layer
 */
const ElbLayerConfigSchema = z.union([
  z.boolean(),
  z.string(),
  z.any().describe('Elb.Layer array for async command queuing'),
]);

/**
 * Browser source settings schema
 */
export const SettingsSchema = z.object({
  prefix: DataAttributePrefix.default('data-elb').describe(
    'Prefix for data attributes (default: data-elb)',
  ),

  scope: ScopeSelector.describe(
    'DOM scope for event tracking (default: document)',
  ),

  pageview: z
    .boolean()
    .default(true)
    .describe('Enable automatic pageview tracking'),

  session: SessionConfigSchema.default(true).describe(
    'Enable session tracking (boolean or SessionConfig object)',
  ),

  elb: JavaScriptVarName.default('elb').describe(
    'Name for global elb function',
  ),

  name: z.string().describe('Custom name for source instance').optional(),

  elbLayer: ElbLayerConfigSchema.default('elbLayer').describe(
    'Enable elbLayer for async command queuing (boolean, string, or Elb.Layer)',
  ),
});

// Note: We export the inferred type, but types/index.ts will override
// specific fields with non-serializable types
export type Settings = z.infer<typeof SettingsSchema>;
