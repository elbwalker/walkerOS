import { z } from '@walkeros/core/dev';
import {
  ConsentModeSchema,
  GA4SettingsSchema,
  AdsSettingsSchema,
  GTMSettingsSchema,
} from './primitives';

export const SettingsSchema = z
  .object({
    como: ConsentModeSchema.describe(
      'Consent mode configuration: false (disabled), true (use defaults), or custom mapping',
    ).optional(),
    como_advanced: z
      .union([z.boolean(), z.number()])
      .describe(
        'Advanced consent mode (non-EU): emit denied default at page load with wait_for_update (true=500ms, or a number of ms)',
      )
      .optional(),
    ga4: GA4SettingsSchema.describe(
      'GA4-specific configuration settings (like { measurementId: G-XXXXXXXXXX })',
    ).optional(),
    ads: AdsSettingsSchema.describe(
      'Google Ads specific configuration settings (like { conversionId: AW-XXXXXXXXX })',
    ).optional(),
    gtm: GTMSettingsSchema.describe(
      'Google Tag Manager specific configuration settings (like { containerId: GTM-XXXXXXX })',
    ).optional(),
  })
  .refine(
    (data) => {
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

export type Settings = z.infer<typeof SettingsSchema>;
