import { z } from '@walkeros/core';
import {
  ConsentModeSchema,
  GA4SettingsSchema,
  AdsSettingsSchema,
  GTMSettingsSchema,
} from './primitives';

/**
 * Gtag Settings Schema
 * Configuration for Google tools (GA4, Ads, GTM)
 * At least one tool must be configured
 */
export const SettingsSchema = z
  .object({
    como: ConsentModeSchema.describe(
      'Consent mode configuration: false (disabled), true (use defaults), or custom mapping',
    ).optional(),
    ga4: GA4SettingsSchema.describe(
      'Google Analytics 4 configuration',
    ).optional(),
    ads: AdsSettingsSchema.describe('Google Ads configuration').optional(),
    gtm: GTMSettingsSchema.describe(
      'Google Tag Manager configuration',
    ).optional(),
  })
  .refine(
    (data) => {
      // At least one tool must be configured
      return (
        data.ga4?.measurementId ||
        data.ads?.conversionId ||
        data.gtm?.containerId
      );
    },
    {
      message:
        'At least one Google tool must be configured (ga4.measurementId, ads.conversionId, or gtm.containerId)',
    },
  );

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
