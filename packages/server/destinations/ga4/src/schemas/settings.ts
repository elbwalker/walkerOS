import { z } from '@walkeros/core/dev';
import { MeasurementIdSchema } from './primitives';

export const SettingsSchema = z
  .object({
    measurementId: MeasurementIdSchema.describe(
      'GA4 measurement id of the web data stream (like G-ABC123XYZ)',
    ),
    apiSecret: z
      .string()
      .min(1)
      .describe(
        'Measurement Protocol API secret: GA4 Admin > Data streams > the stream > Measurement Protocol API secrets (like Ab12Cd34...)',
      ),
    url: z
      .string()
      .url()
      .describe(
        'Endpoint without query string. EU collection: https://region1.google-analytics.com/mp/collect; testing: https://www.google-analytics.com/debug/mp/collect (like https://www.google-analytics.com/mp/collect)',
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
