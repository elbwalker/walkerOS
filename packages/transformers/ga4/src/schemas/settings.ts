import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    mapping: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .optional()
      .describe(
        "Mapping rules keyed by GA4 event name (`en`), `'*'` for unknown events. A rule replaces the matching default unless it sets `extend` or `remove`; `ignore: true` drops the event.",
      ),
    tidPattern: z
      .string()
      .optional()
      .describe(
        'Regex string the tracking ID (`tid`) must match, compiled once at init. Default `^G-`, which drops Ads (`AW-`) and DC (`DC-`) hits.',
      ),
    maxEvents: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Maximum number of events (POST body lines) decoded from one request. A request above the cap is dropped whole. Default 100.',
      ),
  })
  .describe(
    'GA4 transformer: decodes GA4 Measurement Protocol v2 requests from ctx.ingest into walkerOS events.',
  );

export type Settings = z.infer<typeof SettingsSchema>;
