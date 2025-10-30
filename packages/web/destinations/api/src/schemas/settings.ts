import { z } from '@walkeros/core';

/**
 * API Settings Schema
 * Configuration for API destination (generic HTTP endpoint)
 */
export const SettingsSchema = z.object({
  url: z.string().url().describe('Target API endpoint URL for sending events'),
  headers: z
    .record(z.string())
    .describe('HTTP headers to include in requests (key-value pairs)')
    .optional(),
  method: z.string().describe('HTTP method (default: POST)').optional(),
  transform: z
    .any()
    .describe('Custom function to transform event data before sending')
    .optional(),
  transport: z
    .enum(['fetch', 'beacon', 'xhr'])
    .describe('Transport method for sending requests (default: fetch)')
    .optional(),
});

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
