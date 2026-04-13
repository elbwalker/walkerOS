import { z } from '@walkeros/core/dev';

/**
 * Pinterest Conversions API Mapping Schema
 * Pinterest CAPI has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
