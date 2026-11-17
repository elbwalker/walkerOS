import { z } from '@walkeros/core/dev';

/**
 * OpenAI Ads Conversions API Mapping Schema
 * The rule `name` is the OpenAI event type; no other rule settings.
 */
export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
