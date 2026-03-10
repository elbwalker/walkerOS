import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  bucket: z.string().min(1).describe('GCS bucket name'),
  prefix: z
    .string()
    .optional()
    .describe('Key prefix prepended to all store keys for scoping'),
  credentials: z
    .union([
      z.string(),
      z.object({
        client_email: z.string().describe('Service account email'),
        private_key: z.string().describe('RSA private key in PEM format'),
      }),
    ])
    .optional()
    .describe(
      'Service account JSON (string or object). Omit for ADC on Cloud Run/GKE',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
