import { z } from '@walkeros/core/dev';
import { ActionSourceSchema } from './primitives';

export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe(
      'Reddit Conversion Access Token for Bearer authentication (like rdt_ABC123...)',
    ),
  pixelId: z
    .string()
    .min(1)
    .describe(
      'Reddit Pixel ID used as the API path parameter (like a2_abcdef123456)',
    ),
  action_source: ActionSourceSchema.describe(
    'Source of the event (WEBSITE, APP, PHYSICAL_STORE) (like WEBSITE)',
  ).optional(),
  doNotHash: z
    .array(z.string())
    .describe("Array of user fields that should not be hashed (like ['email'])")
    .optional(),
  test_mode: z
    .boolean()
    .describe(
      'Enable test mode by sending test_mode: true in the request body (like true)',
    )
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'Custom URL for Reddit Conversions API endpoint (like https://ads-api.reddit.com/api/v2.0/conversions/events/)',
    )
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe(
      "Mapping configuration for user fields (like { email: 'user.email', external_id: 'user.id' })",
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
