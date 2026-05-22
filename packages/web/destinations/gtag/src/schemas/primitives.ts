import { z } from '@walkeros/core/dev';

/**
 * Consent Mode Configuration
 * Can be false (disabled), true (use defaults), or custom mapping
 */
export const ConsentModeSchema = z.union([
  z.boolean(),
  z.record(z.string(), z.union([z.string(), z.array(z.string())])),
]);

export const GA4SettingsSchema = z.object({
  measurementId: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, 'Must be a valid GA4 Measurement ID (G-XXXXXXXXXX)')
    .describe('GA4 Measurement ID from Google Analytics (like G-XXXXXXXXXX)'),
  debug: z
    .boolean()
    .describe('Enable debug mode for GA4 (like true)')
    .optional(),
  pageview: z
    .boolean()
    .describe('Enable automatic pageview tracking (like true)')
    .optional(),
  server_container_url: z
    .string()
    .url()
    .describe(
      'Server-side GTM container URL (like https://server-container.com)',
    )
    .optional(),
  snakeCase: z
    .boolean()
    .describe('Convert parameter names to snake_case (like true)')
    .optional(),
  transport_url: z
    .string()
    .url()
    .describe(
      'Custom transport URL for GA4 (like https://analytics.example.com/mp/collect)',
    )
    .optional(),
  data: z.any().describe('Custom data mapping configuration').optional(),
});

/**
 * User Data Mapping Schema
 * Maps walkerOS event fields to Google's user_data structure
 */
export const UserDataMappingSchema = z.object({
  email: z
    .any()
    .describe('Mapping value for user email (like user.email)')
    .optional(),
  phone_number: z
    .any()
    .describe('Mapping value for user phone number (like user.phone)')
    .optional(),
  address: z
    .object({
      first_name: z
        .any()
        .describe('Mapping value for first name (like data.firstName)')
        .optional(),
      last_name: z
        .any()
        .describe('Mapping value for last name (like data.lastName)')
        .optional(),
      street: z.any().describe('Mapping value for street address').optional(),
      city: z
        .any()
        .describe('Mapping value for city (like user.city)')
        .optional(),
      region: z
        .any()
        .describe('Mapping value for region/state (like user.region)')
        .optional(),
      postal_code: z
        .any()
        .describe('Mapping value for postal/zip code (like user.zip)')
        .optional(),
      country: z
        .any()
        .describe('Mapping value for country (like user.country)')
        .optional(),
    })
    .describe('Address mapping for enhanced conversions')
    .optional(),
});

/**
 * Google Ads Settings Schema
 * Configuration for Google Ads conversions
 */
export const AdsSettingsSchema = z.object({
  conversionId: z
    .string()
    .regex(/^AW-[0-9]+$/, 'Must be a valid Ads Conversion ID (AW-XXXXXXXXXX)')
    .describe('Google Ads Conversion ID (required)'),
  currency: z
    .string()
    .length(3)
    .describe('Currency code (ISO 4217, e.g., USD, EUR)')
    .optional(),
  data: z
    .any()
    .describe('Custom data mapping (WalkerOS.Mapping.Value | Values)')
    .optional(),
  enhancedConversions: UserDataMappingSchema.describe(
    'Enhanced conversions: maps event fields to Google user_data for improved measurement accuracy',
  ).optional(),
});

/**
 * GTM Settings Schema
 * Configuration for Google Tag Manager
 */
export const GTMSettingsSchema = z.object({
  containerId: z
    .string()
    .regex(/^GTM-[A-Z0-9]+$/, 'Must be a valid GTM Container ID (GTM-XXXXXXX)')
    .describe('GTM Container ID (required)'),
  dataLayer: z
    .string()
    .describe('Custom dataLayer variable name (default: dataLayer)')
    .optional(),
  domain: z
    .string()
    .describe('Custom GTM domain for script loading')
    .optional(),
  data: z
    .any()
    .describe('Custom data mapping (WalkerOS.Mapping.Value | Values)')
    .optional(),
});
