import { z } from '@walkeros/core/dev';

/**
 * Per-event Snowplow settings override schema
 */
export const SnowplowMappingSettingsSchema = z.object({
  actionSchema: z
    .string()
    .optional()
    .describe('Override action schema for this specific event'),
  schemas: z
    .object({
      product: z.string().optional(),
      cart: z.string().optional(),
      transaction: z.string().optional(),
      refund: z.string().optional(),
      checkout_step: z.string().optional(),
      promotion: z.string().optional(),
      user: z.string().optional(),
    })
    .catchall(z.string())
    .optional()
    .describe('Override entity schemas for this specific event'),
});

/**
 * Context entity type enum
 * Maps to Snowplow blessed ecommerce schemas
 */
export const ContextTypeSchema = z.enum([
  'product',
  'cart',
  'transaction',
  'refund',
  'checkout_step',
  'promotion',
  'user',
]);

/**
 * Custom mapping parameters schema for Snowplow events
 *
 * Note: Use the standard `name` field from mapping rules for the action type
 * (like GA4 pattern). The `name` maps to Snowplow's event.data.type.
 */
export const MappingSchema = z.object({
  contextType: ContextTypeSchema.optional().describe(
    'Explicit context entity type for flat mapped data (required, no auto-detection)',
  ),
  snowplow: SnowplowMappingSettingsSchema.optional().describe(
    'Snowplow-specific settings override',
  ),
});

export type ContextType = z.infer<typeof ContextTypeSchema>;

export type Mapping = z.infer<typeof MappingSchema>;
export type SnowplowMappingSettings = z.infer<
  typeof SnowplowMappingSettingsSchema
>;
