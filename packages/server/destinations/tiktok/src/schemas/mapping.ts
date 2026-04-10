import { z } from '@walkeros/core/dev';

/**
 * TikTok Events API Mapping Schema
 * TikTok Events API has no event-level mapping configuration
 */
export const MappingSchema = z.object({});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
