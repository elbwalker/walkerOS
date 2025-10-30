import { z } from '@walkeros/core';

/**
 * API Mapping Schema
 * API has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
