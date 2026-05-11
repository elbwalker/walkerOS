import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  client: z
    .any()
    .describe(
      'Google Cloud Pub/Sub client instance (like new PubSub({ projectId, keyFilename }))',
    )
    .optional(),
  projectId: z
    .string()
    .min(1)
    .describe('Google Cloud Project ID (like my-gcp-project)'),
  topic: z
    .string()
    .min(1)
    .describe(
      'Pub/Sub topic short name (like events). The full resource name projects/<projectId>/topics/<topic> is built by the SDK.',
    ),
  credentials: z
    .any()
    .describe(
      'Service account credentials as a JSON string or an object with client_email and private_key. Default: Application Default Credentials (ADC).',
    )
    .optional(),
  apiEndpoint: z
    .string()
    .describe(
      'Override Pub/Sub API endpoint. Useful for the local emulator (like localhost:8085).',
    )
    .optional(),
  orderingKey: z
    .any()
    .describe(
      'Mapping value resolved per-event. Truthy enables per-key ordering for the publish.',
    )
    .optional(),
  attributes: z
    .any()
    .describe(
      'Default per-event attribute map merged into every published message. Mapping.Map shape.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
