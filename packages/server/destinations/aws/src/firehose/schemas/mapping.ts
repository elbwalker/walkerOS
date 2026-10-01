import { z } from '@walkeros/core/dev';

/**
 * AWS Firehose Mapping Schema
 * Firehose has no rule-level settings: a rule's `data` becomes the record.
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
