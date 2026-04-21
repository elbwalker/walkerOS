import { z } from '@walkeros/core/dev';

/**
 * Snapchat Conversions API Mapping Schema
 * Snapchat CAPI has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
