import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    url: z
      .string()
      .url()
      .describe(
        'The HTTP endpoint URL to send events to (like https://api.example.com/events)',
      ),
    headers: z
      .record(z.string(), z.string())
      .describe(
        "Additional HTTP headers to include with requests (like { 'Content-Type': 'application/json' }). Every visitor's browser receives them, so a header may carry a public key but never a secret.",
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
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
