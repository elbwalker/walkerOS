import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    basePath: z
      .string()
      .min(1)
      .describe(
        'Root directory for file operations. All keys are resolved relative to this path.',
      ),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
