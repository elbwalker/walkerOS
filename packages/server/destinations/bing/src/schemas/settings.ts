import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe(
      'Long-lived Bing UET CAPI access token from Microsoft Advertising',
    ),
  tagId: z.string().min(1).describe('Microsoft Advertising UET tag ID'),
  url: z
    .string()
    .url()
    .describe(
      'Custom Bing UET CAPI base URL (default https://capi.uet.microsoft.com/v1/)',
    )
    .optional(),
  doNotHash: z
    .array(z.string())
    .describe("User data fields to skip hashing (like ['em', 'ph'])")
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe("Mapping for user data fields (like { em: 'user.email' })")
    .optional(),
  dataProvider: z
    .string()
    .describe('Identifier of the data source (default "walkerOS")')
    .optional(),
  continueOnValidationError: z
    .boolean()
    .describe(
      'When true, Microsoft continues to ingest events despite validation errors',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
