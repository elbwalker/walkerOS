import { schemas, z } from '@walkeros/core/dev';

const { ValueSchema } = schemas;

export const CustomDimensionsSchema = z.record(
  z.string().regex(/^\d+$/, 'Dimension keys are bare numeric ids like "1"'),
  ValueSchema,
);

export const SettingsSchema = z.object({
  appId: z
    .string()
    .min(1)
    .describe(
      'ID of the Piwik PRO site (like XXX-XXX-XXX-XXX-XXX). Required when loadScript is true',
    )
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'URL of your Piwik PRO account, normalized to one trailing slash (like https://your_account_name.piwik.pro/). Required when loadScript is true',
    )
    .optional(),
  linkTracking: z
    .boolean()
    .default(true)
    .describe(
      'Automatic outlink and download tracking, enabled right after the first hit this destination sends. Default: true',
    ),
  identified: z
    .union([z.boolean(), z.record(z.string(), z.boolean())])
    .describe(
      'Identified or anonymous tracking. true (default) identifies every hit, false switches the tracker to anonymous mode (setUserIsAnonymous) at init. A consent object like { marketing: true } identifies only while that consent is granted and calls deanonymizeUser once it is. Do not repeat these states in config.consent, or events are queued and never reach the destination.',
    )
    .optional(),
  customDimensions: CustomDimensionsSchema.describe(
    'Custom dimensions applied to every hit, keyed by bare dimension id (like { "1": "data.size" }). Rule-level customDimensions win per key.',
  ).optional(),
});
