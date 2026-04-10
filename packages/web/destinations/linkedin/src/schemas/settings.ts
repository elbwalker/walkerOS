import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .regex(
      /^\d+$/,
      'Must be a numeric LinkedIn Partner ID (digits only, e.g. "123456")',
    )
    .describe(
      'Your LinkedIn Partner ID (numeric string, typically 6–7 digits). Find it in Campaign Manager → Insight Tag → Manage Insight Tag. Assigned to window._linkedin_partner_id before the Insight Tag script loads.',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
