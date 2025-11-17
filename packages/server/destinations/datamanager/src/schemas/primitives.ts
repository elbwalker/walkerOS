import { z } from '@walkeros/core';

export const AccountTypeSchema = z.enum([
  'GOOGLE_ADS',
  'DISPLAY_VIDEO_ADVERTISER',
  'DISPLAY_VIDEO_PARTNER',
  'GOOGLE_ANALYTICS_PROPERTY',
]);

export const EventSourceSchema = z.enum([
  'WEB',
  'APP',
  'IN_STORE',
  'PHONE',
  'OTHER',
]);

export const ConsentStatusSchema = z.enum([
  'CONSENT_GRANTED',
  'CONSENT_DENIED',
]);

export const ConsentSchema = z.object({
  adUserData: ConsentStatusSchema.describe(
    'Consent for data collection and use',
  ).optional(),
  adPersonalization: ConsentStatusSchema.describe(
    'Consent for ad personalization',
  ).optional(),
});

export const OperatingAccountSchema = z.object({
  accountId: z
    .string()
    .min(1)
    .describe('Account ID (e.g., "123-456-7890" for Google Ads)'),
  accountType: AccountTypeSchema.describe('Type of account'),
});

export const DestinationSchema = z.object({
  operatingAccount: OperatingAccountSchema.describe(
    'Operating account details',
  ),
  productDestinationId: z
    .string()
    .min(1)
    .describe(
      'Product-specific destination ID (conversion action or user list)',
    ),
});
