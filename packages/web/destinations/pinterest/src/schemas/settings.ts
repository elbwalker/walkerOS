import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .regex(/^\d+$/, 'Must be a numeric Pinterest Tag ID')
    .min(6)
    .describe(
      'Your Pinterest Tag ID (numeric string, e.g. "2612345678901"). Found in Pinterest Ads Manager under Conversions → Pinterest Tag. Passed to pintrk("load", tagId).',
    ),
  pageview: z
    .boolean()
    .describe(
      'Fire pintrk("page") once in init after core.js loads. Default true (matches Pinterest\'s base code convention). Set false when walkerOS sources already emit page view events and you would otherwise get a duplicate initial fire.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to enhanced matching fields: { em?: string, external_id?: string }. em is auto-hashed by the Pinterest JS tag — do not hash before passing. Passed to pintrk("load", tagId, data) on init and pintrk("set", data) when the resolved value changes.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
