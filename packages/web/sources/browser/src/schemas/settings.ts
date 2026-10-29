import { z } from '@walkeros/core/dev';
import {
  DataAttributePrefix,
  JavaScriptVarName,
  ScopeSelector,
} from './primitives';

/**
 * ELB Layer configuration schema
 * Note: Runtime type can be boolean | string | Elb.Layer
 */
const ElbLayerConfigSchema = z.union([z.boolean(), z.string(), z.any()]);

/**
 * Browser source settings schema
 */
export const SettingsSchema = z.object({
  prefix: DataAttributePrefix.default('data-elb').describe(
    'Prefix for data attributes (default: data-elb)',
  ),

  scope: ScopeSelector.describe(
    'DOM node to track: an Element, Document or ShadowRoot, not a selector (default: document). A selector string fails the source init with an ERROR',
  ),

  pageview: z
    .boolean()
    .default(true)
    .describe('Enable automatic pageview tracking'),

  capture: z
    .boolean()
    .default(true)
    .describe(
      'Read click/submit triggers in the capture phase so tagged elements are resolved at click time before app handlers run (false reads them in the bubbling phase)',
    ),

  history: z
    .boolean()
    .default(false)
    .describe(
      'Single-page apps: send a page view on every route change (pushState, replaceState with a new path, back and forward) and pick up tagged elements as the new route renders',
    ),

  elb: z
    .union([JavaScriptVarName, z.literal(false)])
    .default('elb')
    .describe('Name for global elb function, or false to install none'),

  name: z.string().describe('Has no effect: nothing reads it').optional(),

  elbLayer: ElbLayerConfigSchema.default('elbLayer').describe(
    'Window command queue to adopt: a name (default: elbLayer) or true for elbLayer; false creates none. An array is not adopted: the source uses window.elbLayer',
  ),
});

// Note: We export the inferred type, but types/index.ts will override
// specific fields with non-serializable types
export type Settings = z.infer<typeof SettingsSchema>;
