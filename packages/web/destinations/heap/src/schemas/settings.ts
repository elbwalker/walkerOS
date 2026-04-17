import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  appId: z
    .string()
    .min(1)
    .describe(
      'Heap App ID. Find it in your Heap project under Settings > App ID.',
    ),
  disableTextCapture: z
    .boolean()
    .describe('Disable Heap auto text capture. Default: true.')
    .optional(),
  disablePageviewAutocapture: z
    .boolean()
    .describe(
      'Disable Heap automatic pageview tracking. Default: true (walkerOS sources handle pageviews).',
    )
    .optional(),
  disableSessionReplay: z
    .boolean()
    .describe('Disable Heap session replay.')
    .optional(),
  secureCookie: z.boolean().describe('SSL-only cookies.').optional(),
  ingestServer: z
    .string()
    .url()
    .describe('Custom server endpoint for proxying Heap data.')
    .optional(),
  identify: z
    .unknown()
    .describe(
      'Destination-level identity mapping. Resolves to a string for heap.identify(). Example: { "key": "user.id" }.',
    )
    .optional(),
  userProperties: z
    .unknown()
    .describe(
      'Destination-level user properties mapping. Resolves to object for heap.addUserProperties(). Example: { "map": { "plan": "data.plan" } }.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
