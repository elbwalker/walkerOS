import { z } from '@walkeros/core/dev';

/**
 * GCP Pub/Sub Mapping Schema
 *
 * Per-rule overrides for topic, orderingKey, and attributes.
 */
export const MappingSchema = z.object({
  topic: z
    .string()
    .describe(
      'Per-rule topic override. Falls back to settings.topic if absent.',
    )
    .optional(),
  orderingKey: z
    .any()
    .describe(
      'Per-rule ordering-key Mapping.Value. Overrides settings.orderingKey when set.',
    )
    .optional(),
  attributes: z
    .any()
    .describe(
      'Per-rule attribute Mapping.Map merged on top of settings.attributes.',
    )
    .optional(),
});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
