import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identify attributes. Resolves to { email?, first_name?, ... }. Use with silent: true on login/identify events.',
    )
    .optional(),
  page: z
    .unknown()
    .describe(
      'Per-event page view. Resolves to { url, ... }. Calls trackPageView(). Use with silent: true.',
    )
    .optional(),
  destroy: z
    .boolean()
    .describe(
      'Permanently delete person from Customer.io. Set true on delete events with silent: true.',
    )
    .optional(),
  suppress: z
    .boolean()
    .describe(
      'Suppress person (stop messaging without deleting data). Set true with silent: true.',
    )
    .optional(),
  unsuppress: z
    .boolean()
    .describe(
      'Unsuppress person (resume messaging). Set true with silent: true.',
    )
    .optional(),
  addDevice: z
    .unknown()
    .describe(
      'Register push device. Resolves to { deviceId, platform, data? }. Use with silent: true.',
    )
    .optional(),
  deleteDevice: z
    .unknown()
    .describe(
      'Remove push device. Resolves to { deviceId, platform }. Use with silent: true.',
    )
    .optional(),
  merge: z
    .unknown()
    .describe(
      'Merge duplicate profiles. Resolves to { primaryType, primaryId, secondaryType, secondaryId }. Use with silent: true.',
    )
    .optional(),
  sendEmail: z
    .unknown()
    .describe(
      'Send transactional email. Resolves to { to, transactional_message_id, message_data?, identifiers? }. Requires appApiKey. Use with silent: true.',
    )
    .optional(),
  sendPush: z
    .unknown()
    .describe(
      'Send transactional push. Resolves to { transactional_message_id, message_data?, identifiers? }. Requires appApiKey. Use with silent: true.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
