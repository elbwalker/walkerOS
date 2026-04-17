import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  siteId: z
    .string()
    .min(1)
    .describe(
      'Customer.io Site ID. Find it in Settings > Workspace Settings > API Credentials.',
    ),
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Customer.io API Key. Find it in Settings > Workspace Settings > API Credentials.',
    ),
  appApiKey: z
    .string()
    .describe(
      'App API Key for transactional messaging (sendEmail/sendPush). Find it in Settings > Workspace Settings > API Credentials > App API Keys.',
    )
    .optional(),
  region: z
    .enum(['us', 'eu'])
    .describe(
      'Data center region. Must match where your Customer.io workspace was created. Default: us.',
    )
    .optional(),
  timeout: z
    .number()
    .int()
    .positive()
    .describe('HTTP request timeout in milliseconds. Default: 10000.')
    .optional(),
  customerId: z
    .string()
    .describe(
      'walkerOS mapping value path to resolve customerId from each event (like user.id).',
    )
    .optional(),
  anonymousId: z
    .string()
    .describe(
      'walkerOS mapping value path to resolve anonymousId from each event (like user.session).',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'Destination-level identity mapping. Resolves to { email?, first_name?, ... } attributes. Fires identify() on first push and re-fires when values change.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
