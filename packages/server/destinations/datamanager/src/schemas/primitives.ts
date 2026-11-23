import { z } from '@walkeros/core/dev';
import { EVENT_SOURCES } from '../constants';

export const AccountTypeSchema = z.enum([
  'GOOGLE_ADS',
  'GOOGLE_ANALYTICS_PROPERTY',
]);

export const EventSourceSchema = z.enum(EVENT_SOURCES);

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
    .regex(/^\d+$/)
    .describe(
      'Numeric account ID: the 10-digit Google Ads customer ID without hyphens, or the Google Analytics property ID',
    ),
  accountType: AccountTypeSchema.describe('Type of account'),
});

export const DestinationSchema = z.object({
  operatingAccount: OperatingAccountSchema.describe(
    'Operating account details',
  ),
  loginAccount: OperatingAccountSchema.optional().describe(
    'Account the credentials belong to, when it is not the operating account: a Google Ads manager account above it',
  ),
  productDestinationId: z
    .string()
    .min(1)
    .describe(
      'Numeric Google Ads conversion action ID; for Google Analytics, the measurement ID (G-...) of a web stream or the Firebase App ID of an app stream',
    ),
});
