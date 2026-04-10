import { z } from '@walkeros/core/dev';
import { ActionSourceSchema } from './primitives';

export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe(
      'Pinterest conversion access token for Bearer authentication (like pina_ABC123...)',
    ),
  adAccountId: z
    .string()
    .regex(/^[0-9]+$/, 'Ad account ID must contain only digits')
    .describe('Pinterest ad account ID from Ads Manager (like 123456789)'),
  action_source: ActionSourceSchema.describe(
    'Source of the event (web, app_android, app_ios, offline) (like web)',
  ).optional(),
  doNotHash: z
    .array(z.string())
    .describe(
      "Array of user_data fields that should not be hashed (like ['external_id'])",
    )
    .optional(),
  test: z
    .boolean()
    .describe(
      'Enable test mode by appending ?test=true to the API URL (like true)',
    )
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'Custom URL for Pinterest Conversions API endpoint (like https://api.pinterest.com/v5/)',
    )
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe(
      "Mapping configuration for user data fields (like { em: 'user.email', ph: 'user.phone' })",
    )
    .optional(),
  partner_name: z
    .string()
    .describe('Third-party partner name for attribution (like ss-walkeros)')
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
