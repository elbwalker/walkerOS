import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  partnerId: z
    .string()
    .min(1)
    .describe('Criteo Partner ID (numeric string, provided by Criteo)'),
  callerId: z
    .string()
    .min(1)
    .describe('Caller ID for user mapping (provided by Criteo)'),
  siteType: z
    .enum(['d', 'm', 't'])
    .describe('Site type: d (desktop), m (mobile web), t (tablet)')
    .optional(),
  country: z
    .string()
    .length(2)
    .describe('ISO 3166-1 alpha-2 country code')
    .optional(),
  language: z.string().length(2).describe('2-letter language code').optional(),
  url: z
    .string()
    .url()
    .describe(
      'Custom Events API endpoint (default https://widget.criteo.com/m/event?version=s2s_v0)',
    )
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe(
      "Mapping for identity fields (like { email: 'user.email', mapped_user_id: 'user.id' })",
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
