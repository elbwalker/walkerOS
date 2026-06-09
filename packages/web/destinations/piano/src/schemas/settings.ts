import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  site: z
    .number()
    .describe(
      'Piano Analytics site id (numeric), from your collection settings',
    ),
  collectDomain: z
    .string()
    .describe('Collection domain endpoint, like https://xxxxxxx.pa-cd.com'),
  options: z
    .record(z.string(), z.unknown())
    .describe('Additional Piano setConfigurations options merged on init')
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
