import { z } from '@walkeros/core/schemas';
import { IncludeSchema } from './primitives';

/**
 * GA4 Mapping Schema
 * Event-level mapping for GA4
 */
export const GA4MappingSchema = z.object({
  include: IncludeSchema.describe(
    'Override which event properties to include for this specific event',
  ).optional(),
});

/**
 * Google Ads Mapping Schema
 * Event-level mapping for Google Ads
 */
export const AdsMappingSchema = z.object({
  label: z
    .string()
    .describe('Conversion label for this specific event')
    .optional(),
});

/**
 * GTM Mapping Schema
 * Event-level mapping for GTM (empty - GTM uses dataLayer directly)
 */
export const GTMMappingSchema = z.object({});

/**
 * Gtag Mapping Schema
 * Tool-specific event-level mappings
 */
export const MappingSchema = z.object({
  ga4: GA4MappingSchema.describe('GA4-specific event mapping').optional(),
  ads: AdsMappingSchema.describe(
    'Google Ads-specific event mapping',
  ).optional(),
  gtm: GTMMappingSchema.describe('GTM-specific event mapping').optional(),
});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
