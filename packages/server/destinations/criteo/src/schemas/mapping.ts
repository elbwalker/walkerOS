import { z } from '@walkeros/core/dev';

/**
 * Criteo Events API Mapping Schema
 * Criteo has no event-level mapping configuration beyond name + data
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
