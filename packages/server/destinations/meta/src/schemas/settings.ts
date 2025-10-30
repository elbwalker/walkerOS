import { z } from '@walkeros/core';
import { ActionSourceSchema } from './primitives';

/**
 * Meta Conversions API Settings Schema
 * Configuration for Meta (Facebook) Conversions API destination
 */
export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe('Meta Conversions API access token (required)'),
  pixelId: z
    .string()
    .regex(/^[0-9]+$/, 'Pixel ID must contain only digits')
    .describe('Meta Pixel ID - numeric identifier (required)'),
  action_source: ActionSourceSchema.describe(
    'Default action source for events (where conversion took place)',
  ).optional(),
  doNotHash: z
    .array(z.string())
    .describe(
      'List of user_data field names that should NOT be hashed (e.g., ["client_ip_address", "client_user_agent"])',
    )
    .optional(),
  test_event_code: z
    .string()
    .describe('Test event code for Meta Events Manager testing')
    .optional(),
  url: z
    .string()
    .url()
    .describe(
      'Custom Meta CAPI endpoint URL (default: https://graph.facebook.com/v18.0/{pixelId}/events)',
    )
    .optional(),
  user_data: z
    .record(z.any())
    .describe(
      'Mapping configuration for user_data fields (WalkerOS.Mapping.Map)',
    )
    .optional(),
});

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
