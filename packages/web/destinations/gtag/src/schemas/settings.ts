import { z } from '@walkeros/core/dev';
import {
  ConsentModeSchema,
  GA4SettingsSchema,
  AdsSettingsSchema,
  GTMSettingsSchema,
} from './primitives';
import { hasTool, TOOL_PATHS, TOOLS } from '../shared/tools';

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
  .strict()
  .refine(hasTool, {
    message: `At least one Google tool must be configured (${TOOL_PATHS})`,
  })
  // The same rule in JSON Schema: each alternative requires one tool's id.
  .meta({
    anyOf: TOOLS.map(({ tool, id }) => ({
      required: [tool],
      properties: { [tool]: { required: [id] } },
    })),
  });

export type Settings = z.infer<typeof SettingsSchema>;
