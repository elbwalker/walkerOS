import { z } from '@walkeros/core/dev';
import { ApiVersionSchema } from './primitives';

export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe(
      'LinkedIn OAuth 2.0 Bearer token for Conversions API authentication (like AQX...)',
    ),
  conversionRuleId: z
    .string()
    .regex(/^[0-9]+$/, 'Conversion rule ID must contain only digits')
    .describe(
      'Default LinkedIn conversion rule ID from Campaign Manager (like 12345678)',
    ),
  apiVersion: ApiVersionSchema.describe(
    'Linkedin-Version header value in YYYYMM format (like 202604)',
  ).optional(),
  doNotHash: z
    .array(z.string())
    .describe(
      "Array of user data fields that should not be hashed (like ['email'])",
    )
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'Custom URL for LinkedIn Conversions API endpoint (like https://api.linkedin.com/rest/)',
    )
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe(
      "Mapping configuration for user data fields (like { email: 'user.email', li_fat_id: 'context.li_fat_id' })",
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
