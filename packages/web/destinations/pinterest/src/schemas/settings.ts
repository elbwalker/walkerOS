import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
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
        'Call pintrk("page") once in init, as Pinterest\'s base code does. Default true. Set false to leave the call out.',
      )
      .optional(),
    identify: z
      .unknown()
      .describe(
        'walkerOS mapping value resolving to enhanced matching fields: { em?: string, external_id?: string }. The Pinterest tag takes em plain (it hashes it with SHA-256 in the browser) or already hashed. Resolved on each event and sent with pintrk("set", data) when it changes; init calls pintrk("load", tagId) without it.',
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
