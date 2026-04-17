import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Klaviyo private API key. Starts with pk_. Find it under Settings > API Keys in your Klaviyo account.',
    ),
  email: z
    .string()
    .describe(
      'walkerOS mapping value path to resolve email from each event (like user.email).',
    )
    .optional(),
  phoneNumber: z
    .string()
    .describe(
      'walkerOS mapping value path to resolve phone number in E.164 format from each event.',
    )
    .optional(),
  externalId: z
    .string()
    .describe(
      'walkerOS mapping value path to resolve external ID from each event (like user.id).',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'Destination-level identity mapping. Resolves to profile attributes { firstName?, lastName?, organization?, properties? }. Fires createOrUpdateProfile() on first push and re-fires when values change.',
    )
    .optional(),
  currency: z
    .string()
    .length(3)
    .describe(
      'Default ISO 4217 currency code for revenue events (like USD, EUR). Sets valueCurrency on Klaviyo events.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
