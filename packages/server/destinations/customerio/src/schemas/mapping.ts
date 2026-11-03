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
      'Per-event page view. Resolves to { url }. Calls trackPageView(), which sends only the url: other resolved fields are not sent. Needs a customerId. Use with silent: true.',
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
      'Suppress the person; unlike destroy, the id cannot be re-added. Set true with silent: true.',
    )
    .optional(),
  unsuppress: z
    .boolean()
    .describe('Undo a suppress for the person. Set true with silent: true.')
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
      'Send transactional email. Resolves to { to, transactional_message_id, message_data?, identifiers? }. Requires appApiKey. Fails today: the SDK accepts only its own SendEmailRequest object, so the call fails with transport. Use with silent: true.',
    )
    .optional(),
  sendPush: z
    .unknown()
    .describe(
      'Send transactional push. Resolves to { transactional_message_id, message_data?, identifiers? }. Requires appApiKey. Fails today: the SDK accepts only its own SendPushRequest object, so the call fails with transport. Use with silent: true.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
