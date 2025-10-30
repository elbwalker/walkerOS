import { z } from '@walkeros/core';
import { StandardEventName, CustomEventName } from './primitives';

/**
 * Meta Pixel Mapping Schema
 * Event-level mapping configuration for Meta Pixel
 */
export const MappingSchema = z.object({
  track: StandardEventName.describe(
    'Meta Pixel standard event name to send (e.g., "PageView", "Purchase")',
  ).optional(),
  trackCustom: CustomEventName.describe(
    'Custom event name for tracking non-standard events (e.g., "NewsletterSignup")',
  ).optional(),
});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
