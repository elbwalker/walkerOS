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
