import { z } from '@walkeros/core';
import { CorsOptionsSchema } from './primitives';

/**
 * GCP CloudFunction source settings schema
 */
export const SettingsSchema = z.object({
  cors: z
    .union([z.boolean(), CorsOptionsSchema])
    .describe(
      'CORS configuration: false = disabled, true = allow all origins, object = custom configuration',
    )
    .optional(),

  timeout: z
    .number()
    .int()
    .positive()
    .max(540000) // GCP Cloud Functions max timeout: 9 minutes
    .describe('Request timeout in milliseconds (max: 540000 for GCP)')
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
