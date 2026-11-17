import { z } from '@walkeros/core/dev';

/**
 * Gravity Conversions API Mapping Schema
 * The rule `name` is the Gravity event name; no other rule settings.
 */
export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
