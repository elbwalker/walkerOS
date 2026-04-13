import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your PostHog project API key (starts with "phc_"). Find it in your PostHog project settings under "Project API Key" (like phc_a1b2c3d4e5f6789012345678abcdef12).',
    ),
  api_host: z
    .string()
    .describe(
      'PostHog API host. Defaults to https://us.i.posthog.com. Use https://eu.i.posthog.com for the EU region.',
    )
    .optional(),
  ui_host: z
    .string()
    .describe(
      'URL of the PostHog UI host, used by toolbar and replay player. Default: null.',
    )
    .optional(),
  persistence: z
    .enum([
      'localStorage+cookie',
      'cookie',
      'localStorage',
      'sessionStorage',
      'memory',
    ])
    .describe('Where to persist user identity. Default: "localStorage+cookie".')
    .optional(),
  person_profiles: z
    .enum(['always', 'never', 'identified_only'])
    .describe(
      'When to create person profiles. "identified_only" (default) creates profiles only after identify() is called.',
    )
    .optional(),
  autocapture: z
    .boolean()
    .describe(
      "Enable PostHog's autocapture of clicks, form submits, and pageviews. Default: false (walkerOS sources handle capture).",
    )
    .optional(),
  capture_pageview: z
    .union([z.boolean(), z.literal('history_change')])
    .describe(
      'Whether PostHog should auto-capture pageview events. Default: false (walkerOS sources handle this).',
    )
    .optional(),
  capture_pageleave: z
    .union([z.boolean(), z.literal('if_capture_pageview')])
    .describe(
      'Whether PostHog should auto-capture pageleave events. Default: false.',
    )
    .optional(),
  capture_heatmaps: z
    .boolean()
    .describe('Enable heatmap data capture. Default: true (PostHog default).')
    .optional(),
  capture_exceptions: z
    .boolean()
    .describe('Enable automatic exception capture. Default: false.')
    .optional(),
  disable_surveys: z
    .boolean()
    .describe('Disable PostHog surveys. Default: false.')
    .optional(),
  disable_session_recording: z
    .boolean()
    .describe('Disable session recording. Default: false.')
    .optional(),
  advanced_disable_flags: z
    .boolean()
    .describe('Disable feature flag loading. Default: false.')
    .optional(),
  cookieless_mode: z
    .enum(['always', 'on_reject'])
    .describe(
      '"always" never uses cookies/localStorage. "on_reject" falls back to cookieless when consent is rejected.',
    )
    .optional(),
  debug: z
    .boolean()
    .describe('Enable PostHog SDK debug logging. Default: false.')
    .optional(),
  session_recording: z
    .unknown()
    .describe(
      'Session Replay options (SessionRecordingOptions). Masking, blocking, sampling. See PostHog docs for full list.',
    )
    .optional(),
  bootstrap: z
    .unknown()
    .describe(
      'SSR bootstrap data. { distinctID?, featureFlags? } — pre-populates identity and flag values to avoid first-render flicker.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to an identity object. Keys: distinctId, $set, $set_once. Resolved on first push and re-fired when distinctId changes.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to a group object. Keys: type, key, properties. Resolved on first push and re-fired when type/key changes.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
