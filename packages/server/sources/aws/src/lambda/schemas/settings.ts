import { z } from '@walkeros/core/dev';
import { CorsOptionsSchema } from './primitives';

/**
 * AWS Lambda source settings schema
 */
export const SettingsSchema = z.object({
  cors: z
    .union([z.boolean(), CorsOptionsSchema])
    .describe(
      'CORS configuration: false = disabled, true = allow all origins, object = custom configuration',
    )
    .default(true),

  timeout: z
    .number()
    .int()
    .positive()
    .max(900000) // AWS Lambda max timeout: 15 minutes
    .describe('Request timeout in milliseconds (max: 900000 for Lambda)')
    .default(30000),

  enablePixelTracking: z
    .boolean()
    .describe(
      'Enable GET requests with 1x1 transparent GIF response for pixel tracking',
    )
    .default(true),

  healthPath: z
    .string()
    .describe('Health check endpoint path (e.g., /health)')
    .default('/health'),
});

export type Settings = z.infer<typeof SettingsSchema>;
