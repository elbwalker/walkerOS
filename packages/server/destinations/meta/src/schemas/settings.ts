import { z } from '@walkeros/core';
import { ActionSourceSchema } from './primitives';

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
      "Array of user_data fields that should not be hashed (like ['client_ip_address', 'client_user_agent'])",
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
      'Custom URL for Meta Conversions API endpoint (like https://graph.facebook.com/v17.0)',
    )
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe(
      "Mapping configuration for user data fields (like { email: 'user.email', phone: 'user.phone' })",
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
