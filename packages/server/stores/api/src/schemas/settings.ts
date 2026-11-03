import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    url: z
      .string()
      .min(1)
      .describe(
        'Absolute http or https URL with exactly one {key} placeholder after the host, such as https://crm.example.com/customers/{key} or https://crm.example.com/customers?id={key}. The URL-encoded key is the only variable part.',
      ),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
