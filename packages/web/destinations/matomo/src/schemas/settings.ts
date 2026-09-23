import { schemas, z } from '@walkeros/core/dev';

const { ValueSchema } = schemas;

export const CustomDimensionsSchema = z.record(
  z.string().regex(/^\d+$/, 'Dimension keys are bare numeric ids like "1"'),
  ValueSchema,
);

export const SettingsSchema = z.object({
  siteId: z
    .string()
    .min(1)
    .describe(
      'Matomo Site ID (like 1, 2, etc.). Required when loadScript is true',
    )
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'Base URL of your Matomo instance, normalized to one trailing slash (like https://analytics.example.com/ or https://yourname.matomo.cloud/). Required when loadScript is true',
    )
    .optional(),
  disableCookies: z
    .boolean()
    .default(false)
    .describe('Disable all tracking cookies for cookie-free analytics'),
  enableLinkTracking: z
    .boolean()
    .default(true)
    .describe('Enable automatic outlink and download tracking'),
  enableHeartBeatTimer: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Enable heart beat timer with interval in seconds for accurate time-on-page',
    ),
  customDimensions: CustomDimensionsSchema.describe(
    'Custom dimensions applied to every hit, keyed by bare dimension id (like { "1": "data.userType" }). Each value is resolved per event. Rule-level customDimensions win per key.',
  ).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
