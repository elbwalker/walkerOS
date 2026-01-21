import { z } from '@walkeros/core/dev';
import { StandardEventName, CustomEventName } from './primitives';

export const MappingSchema = z.object({
  track: StandardEventName.describe(
    'Meta Pixel standard event name to send (like PageView or Purchase)',
  ).optional(),
  trackCustom: CustomEventName.describe(
    'Custom event name for tracking non-standard events (like NewsletterSignup)',
  ).optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
