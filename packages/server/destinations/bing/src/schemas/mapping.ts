import { z } from '@walkeros/core/dev';
import { EventTypeSchema } from './primitives';

/**
 * Bing UET CAPI Mapping Schema
 * Per-event overrides. Use `eventType: 'pageLoad'` for page view events.
 */
export const MappingSchema = z.object({
  eventType: EventTypeSchema.describe(
    'Override event type: "pageLoad" for page views, "custom" (default) otherwise',
  ).optional(),
});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
