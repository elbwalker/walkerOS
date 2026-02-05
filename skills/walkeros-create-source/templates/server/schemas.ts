import { z } from 'zod';

/**
 * Zod schemas for source validation.
 * Use these to validate settings and input.
 */

export const SettingsSchema = z.object({
  validateSignature: z.boolean().optional().default(false),
  apiKeyHeader: z.string().optional().default('x-api-key'),
});

export const InputSchema = z.object({
  event: z.string(),
  properties: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  timestamp: z.number().optional(),
});

export const BatchInputSchema = z.object({
  batch: z.array(InputSchema),
});
