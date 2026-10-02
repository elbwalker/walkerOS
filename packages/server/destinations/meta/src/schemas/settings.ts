import { schemas, z } from '@walkeros/core/dev';
import { userDataKeys } from '../userData';
import { ActionSourceSchema } from './primitives';

const InputSchema = z.union([
  schemas.MappingSchemas.ValueSchema,
  z.literal(false),
]);

export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe(
      'Meta access token for Conversions API authentication (like your_access_token)',
    ),
  pixelId: z
    .string()
    .regex(/^[0-9]+$/, 'Pixel ID must contain only digits')
    .describe(
      'Meta Pixel ID from your Facebook Business account (like 1234567890)',
    ),
  action_source: ActionSourceSchema.describe(
    'Source of the event (website, app, phone_call, etc.) (like website)',
  ).optional(),
  doNotHash: z
    .array(z.string())
    .describe(
      "user_data keys to send without normalizing and hashing, for values that are already hashed. Only em, ph, fn, ln, db, ge, ct, st, zp, country and external_id are hashed (like ['external_id'])",
    )
    .optional(),
  test_event_code: z
    .string()
    .describe(
      'Test event code for debugging Meta Conversions API events (like TEST12345)',
    )
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'Custom URL for Meta Conversions API endpoint (like https://graph.facebook.com/v22.0)',
    )
    .optional(),
  user_data: z
    .partialRecord(z.enum(userDataKeys), schemas.MappingSchemas.ValueSchema)
    .describe(
      "Mapping of Meta customer information parameters to event values, applied to every event. Keys must be Meta's short names such as em and ph (like { em: 'user.email', ph: 'user.phone' })",
    )
    .optional(),
  ip: InputSchema.describe(
    'Client IP, sent as user_data.client_ip_address. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped user_data.client_ip_address wins.',
  ).optional(),
  userAgent: InputSchema.describe(
    'Client user agent, sent as user_data.client_user_agent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped user_data.client_user_agent wins.',
  ).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
