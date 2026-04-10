import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your Amplitude project API key. Find it in your Amplitude project settings under "General" → "API Keys".',
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
      'Session Replay plugin options. When present, the @amplitude/plugin-session-replay-browser plugin is loaded with these options.',
    )
    .optional(),
  experiment: z
    .unknown()
    .describe(
      'Feature Experiment SDK config. Must include `deploymentKey`. When present, the @amplitude/experiment-js-client SDK is initialized with Amplitude Analytics wiring.',
    )
    .optional(),
  engagement: z
    .unknown()
    .describe(
      'Guides & Surveys plugin config. Pass `true` for defaults, or an options object for custom configuration.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
