import { z } from '@walkeros/core';

/**
 * Include configuration for GA4
 * Specifies which event properties to include
 */
export const IncludeSchema = z.array(
  z.enum([
    'all',
    'context',
    'data',
    'event',
    'globals',
    'source',
    'user',
    'version',
  ]),
);

/**
 * Consent Mode Configuration
 * Can be false (disabled), true (use defaults), or custom mapping
 */
export const ConsentModeSchema = z.union([
  z.boolean(),
  z.record(z.union([z.string(), z.array(z.string())])),
]);

/**
 * GA4 Settings Schema
 * Configuration for Google Analytics 4
 */
export const GA4SettingsSchema = z.object({
  measurementId: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, 'Must be a valid GA4 Measurement ID (G-XXXXXXXXXX)')
    .describe('GA4 Measurement ID (required)'),
  debug: z.boolean().describe('Enable GA4 debug mode').optional(),
  include: IncludeSchema.describe(
    'Which event properties to include in GA4 events',
  ).optional(),
  pageview: z.boolean().describe('Automatically send pageviews').optional(),
  server_container_url: z
    .string()
    .url()
    .describe('Server-side GTM container URL')
    .optional(),
  snakeCase: z
    .boolean()
    .describe('Convert parameter names to snake_case')
    .optional(),
  transport_url: z
    .string()
    .url()
    .describe('Custom transport URL for sending data')
    .optional(),
  data: z
    .any()
    .describe('Custom data mapping (WalkerOS.Mapping.Value | Values)')
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
