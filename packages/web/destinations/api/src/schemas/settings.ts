import { z } from '@walkeros/core';

export const SettingsSchema = z.object({
  url: z
    .string()
    .url()
    .describe(
      'The HTTP endpoint URL to send events to (like https://api.example.com/events)',
    ),
  headers: z
    .record(z.string())
    .describe(
      "Additional HTTP headers to include with requests (like { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' })",
    )
    .optional(),
  method: z.string().default('POST').describe('HTTP method for the request'),
  transform: z
    .any()
    .describe(
      'Function to transform event data before sending (like (data, config, mapping) => JSON.stringify(data))',
    )
    .optional(),
  transport: z
    .enum(['fetch', 'xhr', 'beacon'])
    .default('fetch')
    .describe('Transport method for sending requests'),
});

export type Settings = z.infer<typeof SettingsSchema>;
