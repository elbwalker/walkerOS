import { z } from '@walkeros/core/dev';

/**
 * ClickHouse Mapping Schema
 * ClickHouse receives raw events, so there is no event-level mapping
 * configuration.
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
