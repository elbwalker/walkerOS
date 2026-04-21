import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  orgId: z
    .string()
    .min(1)
    .describe(
      'Your FullStory organization ID (e.g. "o-XXXXXX-na1"). Find it in FullStory under Settings > General.',
    ),
  host: z
    .string()
    .describe('Recording server host for proxy support.')
    .optional(),
  script: z.string().describe('Custom script CDN host domain.').optional(),
  cookieDomain: z
    .string()
    .describe('Override cookie domain for cross-subdomain tracking.')
    .optional(),
  debug: z
    .boolean()
    .describe('Enable browser console debug logging.')
    .optional(),
  devMode: z
    .boolean()
    .describe('Disable recording entirely for development environments.')
    .optional(),
  startCaptureManually: z
    .boolean()
    .describe(
      'Delay capture until FullStory("start") is called. Recommended for GDPR: init the SDK immediately but wait for consent before recording.',
    )
    .optional(),
  namespace: z
    .string()
    .describe('Global FS identifier override (default: "FS").')
    .optional(),
  recordCrossDomainIFrames: z
    .boolean()
    .describe('Enable cross-domain iframe recording.')
    .optional(),
  identify: z
    .unknown()
    .describe(
      'Destination-level identity mapping. Resolves to { uid, properties? } for FullStory setIdentity. Fires on every push.',
    )
    .optional(),
  consent: z
    .record(z.string(), z.enum(['capture', 'consent']))
    .describe(
      'Translation table from walkerOS consent keys to FullStory consent actions. "capture" controls start/shutdown (recording on/off). "consent" controls setIdentity({ consent }) flag. Example: { "analytics": "capture" }.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
