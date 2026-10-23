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
 * Structured event mapping schema (trackStructEvent instead of a
 * self-describing event)
 */
export const StructuredEventMappingSchema = z.object({
  category: z.unknown().describe('Mapping value resolving to the category'),
  action: z.unknown().describe('Mapping value resolving to the action'),
  label: z
    .unknown()
    .optional()
    .describe('Mapping value resolving to the label'),
  property: z
    .unknown()
    .optional()
    .describe('Mapping value resolving to the property'),
  value: z.unknown().optional().describe('Mapping value resolving to a number'),
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
  data: z
    .unknown()
    .optional()
    .describe(
      'Mapping value with a map resolving to the self-describing event data (like { map: { percentProgress: "data.progress" } })',
    ),
  struct: StructuredEventMappingSchema.optional().describe(
    'Send a structured event with trackStructEvent instead of a self-describing event; category and action must resolve to strings',
  ),
});

export type ContextEntity = z.infer<typeof ContextEntitySchema>;
export type Mapping = z.infer<typeof MappingSchema>;
export type SnowplowMappingSettings = z.infer<
  typeof SnowplowMappingSettingsSchema
>;
