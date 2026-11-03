import { z } from '@walkeros/core/dev';
import { CorsOptionsSchema, RouteConfigSchema } from './primitives';

/**
 * Fetch source settings schema.
 */
export const SettingsSchema = z.object({
  path: z
    .string()
    .describe(
      'Single route path, registered for GET and POST. Ignored when paths is set; paths takes several routes.',
    )
    .optional(),

  paths: z
    .array(z.union([z.string(), RouteConfigSchema]))
    .min(1)
    .describe(
      'Route paths to handle. String shorthand accepts GET+POST. RouteConfig allows per-route method control.',
    )
    .optional(),

  cors: z
    .union([z.boolean(), CorsOptionsSchema])
    .describe(
      'CORS configuration: false = disabled, true = allow all (default), object = custom',
    )
    .default(true),

  maxRequestSize: z
    .number()
    .int()
    .positive()
    .describe('Maximum request body size in bytes')
    .default(1024 * 100), // 100KB

  maxBatchSize: z
    .number()
    .int()
    .positive()
    .describe('Maximum events per batch request')
    .default(100),
});

export type Settings = z.infer<typeof SettingsSchema>;
