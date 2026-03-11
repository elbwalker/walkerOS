import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  maxSize: z
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024)
    .describe(
      'Maximum total size in bytes before LRU eviction (default 10 MB)',
    ),
  maxEntries: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of entries before oldest is evicted'),
});

export type Settings = z.infer<typeof SettingsSchema>;
