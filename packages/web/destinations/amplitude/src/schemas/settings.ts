import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your Amplitude project API key. Find it in your Amplitude project settings under "General" → "API Keys" (like a1b2c3d4e5f6789012345678abcdef12).',
    ),
  serverZone: z
    .enum(['US', 'EU'])
    .describe('Amplitude server zone. Default: US.')
    .optional(),
  flushIntervalMillis: z
    .number()
    .int()
    .positive()
    .describe('How often (in ms) to flush the event queue. Default: 1000.')
    .optional(),
  flushQueueSize: z
    .number()
    .int()
    .positive()
    .describe('Max queued events before a flush. Default: 30.')
    .optional(),
  flushMaxRetries: z
    .number()
    .int()
    .nonnegative()
    .describe('Max retries on failed flush. Default: 5.')
    .optional(),
  transport: z
    .enum(['fetch', 'xhr', 'beacon'])
    .describe('HTTP transport. Default: fetch.')
    .optional(),
  useBatch: z
    .boolean()
    .describe(
      'Use the Amplitude batch endpoint instead of the standard endpoint. Default: false.',
    )
    .optional(),
  appVersion: z
    .string()
    .describe('Application version; tagged onto every event.')
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to an identity object. Keys: user, device, session, set, setOnce, add, append, prepend, preInsert, postInsert, remove, unset, clearAll.',
    )
    .optional(),
  sessionReplay: z
    .unknown()
    .describe(
      'Session Replay options, passed to the Session Replay plugin. @amplitude/unified sets up the plugin on every init, whether or not this is set; it records a sampled share of sessions, set by the project sampling settings in Amplitude when present, else by sampleRate (default 0).',
    )
    .optional(),
  experiment: z
    .unknown()
    .describe(
      'Feature Experiment options. Passed to the Experiment plugin only when they include `deploymentKey`. @amplitude/unified sets up the plugin on every init; without a deploymentKey it uses the API key.',
    )
    .optional(),
  engagement: z
    .unknown()
    .describe(
      'Guides & Surveys options object. @amplitude/unified loads the Guides & Surveys SDK from cdn.amplitude.com on every init, whether or not this is set; `true` passes no options.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
