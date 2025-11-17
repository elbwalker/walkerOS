import { z } from '@walkeros/core';
import { CorsOptionsSchema } from './primitives';

/**
 * Express source settings schema
 */
export const SettingsSchema = z.object({
  port: z
    .number()
    .int()
    .min(0) // 0 = random available port
    .max(65535)
    .describe(
      'HTTP server port to listen on. Use 0 for random available port. If not provided, server will not start (app only mode)',
    )
    .optional(),

  path: z
    .string()
    .describe('Event collection endpoint path')
    .default('/collect'),

  cors: z
    .union([z.boolean(), CorsOptionsSchema])
    .describe(
      'CORS configuration: false = disabled, true = allow all origins (default), object = custom configuration',
    )
    .default(true),

  status: z
    .boolean()
    .describe('Enable health check endpoints (/health, /ready)')
    .default(true),
});

export type Settings = z.infer<typeof SettingsSchema>;
