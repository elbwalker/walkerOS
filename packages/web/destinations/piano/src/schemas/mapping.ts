import { z } from '@walkeros/core/dev';

/**
 * Piano Mapping Schema
 * Piano has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
