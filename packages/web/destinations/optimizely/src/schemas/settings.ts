import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  sdkKey: z
    .string()
    .min(1)
    .describe(
      'Your Optimizely Feature Experimentation SDK key. Find it in your Optimizely project under Settings > Environments.',
    ),
  userId: z
    .unknown()
    .describe(
      'walkerOS mapping value to resolve userId for experiment bucketing. Example: "user.id" or { key: "user.id", value: "user.device" } for fallback.',
    )
    .optional(),
  attributes: z
    .unknown()
    .describe(
      'User attributes for audience targeting. Resolves to Record<string, unknown>. Applied to every event via createUserContext().',
    )
    .optional(),
  updateInterval: z
    .number()
    .int()
    .positive()
    .describe(
      'Polling interval for datafile updates in milliseconds. Default: 60000.',
    )
    .optional(),
  autoUpdate: z
    .boolean()
    .describe('Auto-update datafile via polling. Default: true.')
    .optional(),
  batchSize: z
    .number()
    .int()
    .positive()
    .describe('Batch event processor: number of events per batch. Default: 10.')
    .optional(),
  flushInterval: z
    .number()
    .int()
    .positive()
    .describe(
      'Batch event processor: flush interval in milliseconds. Default: 1000.',
    )
    .optional(),
  skipOdp: z
    .boolean()
    .describe(
      'Skip Optimizely Data Platform (ODP) manager initialization. Default: true. Set to false only if you use ODP.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
