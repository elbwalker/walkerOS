import { z } from '@walkeros/core/schemas';

/**
 * AWS Firehose Mapping Schema
 * AWS Firehose has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
