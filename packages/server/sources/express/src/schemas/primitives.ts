import { z } from '@walkeros/core/dev';

/**
 * HTTP methods enum
 */
export const HttpMethod = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);

/**
 * HTTP methods supported for route configuration.
 * OPTIONS is always registered for CORS (not user-configurable per route).
 */
export const RouteMethod = z.enum(['GET', 'POST']);

/**
 * Route configuration for multi-path support.
 */
export const RouteConfigSchema = z.object({
  path: z
    .string()
    .describe('Express route path (supports wildcards like /api/*)'),
  methods: z
    .array(RouteMethod)
    .min(1)
    .describe('HTTP methods to register. OPTIONS always included for CORS.')
    .optional(),
});

/**
 * CORS origin configuration
 * Accepts:
 * - '*' for all origins
 * - Single URL string
 * - Array of URL strings
 */
export const CorsOrigin = z.union([
  z.string(),
  z.array(z.string()),
  z.literal('*'),
]);

/**
 * CORS options schema
 * Configuration for Cross-Origin Resource Sharing
 */
export const CorsOptionsSchema = z.object({
  origin: CorsOrigin.describe(
    'Allowed origins (* for all, URL string, or array of URLs)',
  ).optional(),

  methods: z.array(HttpMethod).describe('Allowed HTTP methods').optional(),

  headers: z.array(z.string()).describe('Allowed request headers').optional(),

  credentials: z
    .boolean()
    .describe('Allow credentials (cookies, authorization headers)')
    .optional(),

  maxAge: z
    .number()
    .int()
    .positive()
    .describe('Preflight cache duration in seconds')
    .optional(),
});

export type CorsOptions = z.infer<typeof CorsOptionsSchema>;
