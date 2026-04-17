import { z } from '@walkeros/core/dev';
import { CustomEventTypeSchema, EventTypeSchema } from './primitives';

export const MappingSchema = z.object({
  eventType: EventTypeSchema.describe(
    "Per-event mParticle event type. Default: 'custom_event'.",
  ).optional(),
  customEventType: CustomEventTypeSchema.describe(
    "Custom event type category for 'custom_event'. Default: 'other'.",
  ).optional(),
  commerce: z
    .unknown()
    .describe(
      'Mapping value resolving to the commerce fields (product_action, currency_code, products, ...) for a commerce_event.',
    )
    .optional(),
  userIdentities: z
    .record(z.string(), z.unknown())
    .describe(
      'Per-event override mapping for user_identities. Merged over settings.userIdentities.',
    )
    .optional(),
  userAttributes: z
    .unknown()
    .describe('Per-event override mapping for user_attributes.')
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
