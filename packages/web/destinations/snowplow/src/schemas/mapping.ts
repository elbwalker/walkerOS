import { z } from '@walkeros/core/dev';

/**
 * Context entity schema
 *
 * Each context entity has a schema URI and data mapping.
 */
export const ContextEntitySchema = z.object({
  schema: z.string().describe('Iglu schema URI for this context entity'),
  data: z
    .record(z.string(), z.unknown())
    .describe('Data mapping for this context entity'),
});

/**
 * Per-event Snowplow settings override schema
 */
export const SnowplowMappingSettingsSchema = z.object({
  actionSchema: z
    .string()
    .optional()
    .describe('Override action schema for this specific event'),
});

/**
 * Custom mapping parameters schema for Snowplow events
 *
 * Use the standard `name` field from mapping rules for the action type.
 * The `name` maps to Snowplow's event.data.type.
 */
export const MappingSchema = z.object({
  context: z
    .array(ContextEntitySchema)
    .optional()
    .describe('Context entities to attach to this event'),
  snowplow: SnowplowMappingSettingsSchema.optional().describe(
    'Snowplow-specific settings override',
  ),
});

export type ContextEntity = z.infer<typeof ContextEntitySchema>;
export type Mapping = z.infer<typeof MappingSchema>;
export type SnowplowMappingSettings = z.infer<
  typeof SnowplowMappingSettingsSchema
>;
