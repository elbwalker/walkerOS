import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  siteId: z
    .number()
    .int()
    .positive()
    .describe(
      'Your Hotjar site ID (e.g. 1234567). Find it in your Hotjar dashboard under Settings.',
    ),
  hotjarVersion: z
    .number()
    .int()
    .positive()
    .describe(
      'Hotjar snippet version. Defaults to 6 (current). Override only if Hotjar releases a new version.',
    )
    .optional(),
  debug: z
    .boolean()
    .describe('Enable Hotjar debug mode for development troubleshooting.')
    .optional(),
  nonce: z
    .string()
    .describe(
      'CSP nonce for the injected Hotjar script tag. Required when using strict Content-Security-Policy.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to { userId, ...attributes } for Hotjar.identify(). userId is extracted as the first argument; remaining keys become user attributes.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
