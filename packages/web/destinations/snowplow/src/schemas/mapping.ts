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
 * Custom mapping parameters schema for Snowplow events
 */
export const MappingSchema = z.object({
  action: z
    .string()
    .optional()
    .describe(
      'Snowplow ecommerce action type (e.g., product_view, add_to_cart, transaction)',
    ),
  snowplow: SnowplowMappingSettingsSchema.optional().describe(
    'Snowplow-specific settings override',
  ),
});

export type Mapping = z.infer<typeof MappingSchema>;
export type SnowplowMappingSettings = z.infer<
  typeof SnowplowMappingSettingsSchema
>;
