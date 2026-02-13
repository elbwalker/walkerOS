import { z } from '@walkeros/core/dev';
import { CorsOptionsSchema, RouteConfigSchema } from './primitives';

/**
 * Fetch source settings input schema (without transform).
 * Used for JSON Schema generation / PropertyTable docs.
 */
export const SettingsInputSchema = z.object({
  /** @deprecated Use `paths` instead */
  path: z.string().describe('Deprecated: use paths instead').optional(),

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

  healthPath: z
    .string()
    .describe('Health check endpoint path')
    .default('/health'),

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

/**
 * Fetch source settings schema.
 * Accepts deprecated `path` (string) and transforms it to `paths` array.
 */
export const SettingsSchema = SettingsInputSchema.transform((s) => {
  const { path, ...rest } = s;
  return {
    ...rest,
    paths: rest.paths ?? (path ? [path] : ['/collect']),
  };
});

export type Settings = z.infer<typeof SettingsSchema>;
