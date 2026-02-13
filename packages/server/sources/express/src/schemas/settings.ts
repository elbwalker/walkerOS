import { z } from '@walkeros/core/dev';
import { CorsOptionsSchema, RouteConfigSchema } from './primitives';

/**
 * Express source settings schema.
 * Accepts deprecated `path` (string) and transforms it to `paths` array.
 */
export const SettingsSchema = z
  .object({
    port: z
      .number()
      .int()
      .min(0)
      .max(65535)
      .describe(
        'HTTP server port to listen on. Use 0 for random available port. If not provided, server will not start (app only mode)',
      )
      .optional(),

    /** @deprecated Use `paths` instead */
    path: z.string().describe('Deprecated: use paths instead').optional(),

    paths: z
      .array(z.union([z.string(), RouteConfigSchema]))
      .min(1)
      .describe(
        'Route paths to register. String shorthand registers GET+POST. RouteConfig allows per-route method control.',
      )
      .optional(),

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
  })
  .transform((s) => {
    const { path, ...rest } = s;
    return {
      ...rest,
      paths: rest.paths ?? (path ? [path] : ['/collect']),
    };
  });

export type Settings = z.infer<typeof SettingsSchema>;
