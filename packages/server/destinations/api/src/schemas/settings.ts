import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  url: z.string().url().describe('The API endpoint URL to send events to'),
  headers: z
    .record(z.string(), z.string())
    .describe('Custom HTTP headers to include with requests')
    .optional(),
  method: z.string().describe('HTTP method to use (default: POST)').optional(),
  timeout: z
    .number()
    .positive()
    .describe('Request timeout in milliseconds (default: 5000)')
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
