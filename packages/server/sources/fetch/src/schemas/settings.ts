import { z } from '@walkeros/core/dev';
import { CorsOptionsSchema } from './primitives';

export const SettingsSchema = z.object({
  path: z.string().default('/collect'),
  cors: z.union([z.boolean(), CorsOptionsSchema]).default(true),
  healthPath: z.string().default('/health'),
  maxRequestSize: z
    .number()
    .int()
    .positive()
    .default(1024 * 100), // 100KB
  maxBatchSize: z.number().int().positive().default(100), // 100 events
});

export type Settings = z.infer<typeof SettingsSchema>;
