import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe('Spreadsheet ID, the segment between /d/ and /edit in the URL'),
  sheet: z
    .string()
    .default('Sheet1')
    .describe('Sheet (tab) name within the spreadsheet'),
  key: z
    .string()
    .default('A')
    .describe('Column letter for keys (the lookup column)'),
  value: z
    .string()
    .default('B')
    .describe('Column letter for values (JSON-serialized blob)'),
  headerRows: z
    .number()
    .int()
    .min(0)
    .default(1)
    .describe('Number of header rows to skip when reading the key column'),
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
      'Service account JSON (string or object). Omit for ADC on Cloud Run/GKE (deprecated: use config.credentials)',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
