import { z } from '@walkeros/core/dev';

/**
 * Plausible Mapping Schema
 * Plausible has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
