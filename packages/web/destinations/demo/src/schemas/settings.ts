import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  name: z
    .string()
    .optional()
    .describe('Display name used in log output prefix'),
  values: z
    .array(z.string())
    .optional()
    .describe(
      'Dot-notation paths to extract from event (e.g. "data.title"). If omitted, logs full event',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
