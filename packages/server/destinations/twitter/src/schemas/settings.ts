import { z } from '@walkeros/core/dev';
import { ApiVersionSchema, EventIdSchema } from './primitives';

export const SettingsSchema = z.object({
  pixelId: z
    .string()
    .min(1)
    .describe('X Pixel ID used in the Conversions API endpoint URL'),
  eventId: EventIdSchema.describe(
    'Default pre-registered conversion event ID (like tw-xxxxx-xxxxx)',
  ),
  consumerKey: z
    .string()
    .min(1)
    .describe('OAuth 1.0a API Key (Consumer Key) for X Ads API'),
  consumerSecret: z
    .string()
    .min(1)
    .describe('OAuth 1.0a API Key Secret (Consumer Secret)'),
  accessToken: z.string().min(1).describe('OAuth 1.0a User Access Token'),
  accessTokenSecret: z
    .string()
    .min(1)
    .describe('OAuth 1.0a User Access Token Secret'),
  apiVersion: ApiVersionSchema.describe(
    'X Ads API version number (like "12")',
  ).optional(),
  doNotHash: z
    .array(z.string())
    .describe(
      "Array of user data fields that should not be hashed (like ['email'])",
    )
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'Custom base URL for the X Conversions API endpoint (like https://ads-api.x.com/)',
    )
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe(
      "Mapping configuration for user identifiers (like { email: 'user.email', twclid: 'context.twclid' })",
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
