import { z } from '@walkeros/core/dev';

/**
 * GCP Pub/Sub push source settings schema.
 *
 * No required fields. The push source is a request-handler; configuration
 * tunables live here, but operators wire `source.push` into their own
 * express/lambda runtime.
 */
export const SettingsSchema = z.object({
  projectId: z
    .string()
    .describe(
      'Google Cloud Project ID. Optional; the push handler does not read it.',
    )
    .optional(),
  decoder: z
    .enum(['json', 'text', 'raw'])
    .describe(
      'Decoder for the message data field. json (default) parses JSON, text forwards the UTF-8 string, raw forwards the Buffer. text and raw values carry no event name: without a before transformer that builds the event the collector rejects them and the push answers 400.',
    )
    .optional(),
  verifyOidc: z
    .boolean()
    .describe(
      'Verify the OIDC bearer token Pub/Sub attaches to push requests. Default: false.',
    )
    .optional(),
  audience: z
    .string()
    .describe(
      'OIDC audience (your endpoint URL or a custom audience). Required when verifyOidc is true.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
