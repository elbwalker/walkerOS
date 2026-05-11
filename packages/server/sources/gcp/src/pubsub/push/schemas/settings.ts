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
      'Google Cloud Project ID (informational, surfaced in error messages).',
    )
    .optional(),
  decoder: z
    .enum(['json', 'text', 'raw'])
    .describe(
      'Decoder for the message data field. json (default) parses JSON, text decodes UTF-8, raw forwards the Buffer.',
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
