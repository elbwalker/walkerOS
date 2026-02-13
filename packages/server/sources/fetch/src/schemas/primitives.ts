import { z } from '@walkeros/core/dev';

export const HttpMethod = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);

export const CorsOrigin = z.union([
  z.string(),
  z.array(z.string()),
  z.literal('*'),
]);

export const CorsOptionsSchema = z.object({
  origin: CorsOrigin.optional(),
  methods: z.array(HttpMethod).optional(),
  headers: z.array(z.string()).optional(),
  credentials: z.boolean().optional(),
  maxAge: z.number().int().positive().optional(),
});

export type CorsOptions = z.infer<typeof CorsOptionsSchema>;

/**
 * HTTP methods supported for route configuration.
 * OPTIONS is always handled for CORS (not user-configurable per route).
 */
export const RouteMethod = z.enum(['GET', 'POST']);

/**
 * Route configuration for multi-path support.
 */
export const RouteConfigSchema = z.object({
  path: z
    .string()
    .describe('URL path pattern (supports wildcards like /api/*)'),
  methods: z
    .array(RouteMethod)
    .min(1)
    .describe('HTTP methods to accept. OPTIONS always included for CORS.')
    .optional(),
});
