import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    apiKey: z
      .string()
      .min(1)
      .describe(
        'Your TikTok Pixel ID. Find it in TikTok Ads Manager under "Assets" → "Events" → "Web Events" → select your pixel → "Setup Web Event" → "Pixel ID".',
      ),
    // `pageview` removed 2026-04-09: TikTok's SDK fires auto page view and
    // the knob was unreliable. Let it fire; don't expose a toggle.
    auto_config: z
      .boolean()
      .describe(
        'Enable automatic form field detection for Advanced Matching. Forwarded to ttq.load(); when unset, the TikTok default applies.',
      )
      .optional(),
    limited_data_use: z
      .boolean()
      .describe(
        'Restrict data use for compliance with U.S. state privacy laws. Forwarded to ttq.load(); when unset, the TikTok default applies.',
      )
      .optional(),
    identify: z
      .unknown()
      .describe(
        'walkerOS mapping value resolving to an Advanced Matching object with any of: email, phone_number, external_id. The destination passes the values to ttq.identify() unhashed; TikTok states that its Pixel hashes email and phone number (SHA-256).',
      )
      .optional(),
  })
  // Pass-through settings are loose: every other TikTok option is forwarded
  // to ttq.load() as given.
  .loose();

export type Settings = z.infer<typeof SettingsSchema>;
