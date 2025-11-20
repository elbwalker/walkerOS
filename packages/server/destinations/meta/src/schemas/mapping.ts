import { z } from '@walkeros/core/schemas';

/**
 * Meta Conversions API Mapping Schema
 * Meta CAPI has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
