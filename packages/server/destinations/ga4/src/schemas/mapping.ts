import { z } from '@walkeros/core/dev';

/**
 * GA4 Measurement Protocol Mapping Schema
 * The rule `name` is the GA4 event name; no other rule settings.
 */
export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
