import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    appId: z
      .string()
      .min(1)
      .describe(
        'Heap App ID. Find it in your Heap project under Settings > App ID.',
      ),
    disableTextCapture: z
      .boolean()
      .describe(
        'Disable Heap auto text capture. Default: true. Applied only with loadScript: true, in the config the classic Heap SDK reads when it loads; with your own Heap snippet, set it there.',
      )
      .optional(),
    secureCookie: z
      .boolean()
      .describe(
        'SSL-only cookies. Applied only with loadScript: true, in the config the classic Heap SDK reads when it loads.',
      )
      .optional(),
    heapConfig: z
      .record(z.string(), z.unknown())
      .describe(
        'Additional options for the classic Heap SDK, merged over disableTextCapture and secureCookie. Applied only with loadScript: true. Example: { "trackingServer": "https://heap.example.com" }.',
      )
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
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
