import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your TikTok Pixel ID. Find it in TikTok Ads Manager under "Assets" → "Events" → "Web Events" → select your pixel → "Setup Web Event" → "Pixel ID".',
    ),
  // `pageview` removed 2026-04-09 — TikTok's SDK fires auto page view and
  // the knob was unreliable. Let it fire; don't expose a toggle.
  auto_config: z
    .boolean()
    .describe(
      'TikTok default: true. Enable automatic form field detection for Advanced Matching.',
    )
    .optional(),
  limited_data_use: z
    .boolean()
    .describe(
      'TikTok default: false. Restrict data use for compliance with U.S. state privacy laws.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to an Advanced Matching object with any of: email, phone_number, external_id. All values are auto-hashed (SHA256) by the TikTok SDK before sending.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
