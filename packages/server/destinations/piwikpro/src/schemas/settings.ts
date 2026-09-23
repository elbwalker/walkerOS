import { schemas, z } from '@walkeros/core/dev';

const { ValueSchema } = schemas;

const InputSchema = z.union([ValueSchema, z.literal(false)]);

export const CustomDimensionsSchema = z.record(
  z.string().regex(/^\d+$/, 'Dimension keys are bare numeric ids like "1"'),
  ValueSchema,
);

export const SettingsSchema = z.object({
  url: z
    .string()
    .url()
    .describe(
      'Piwik PRO account URL, normalized to one trailing slash. Hits go to <url>ppms.php (like https://your_account_name.piwik.pro/)',
    ),
  appId: z
    .string()
    .min(1)
    .describe(
      'Piwik PRO site or app id, sent as idsite (like XXX-XXX-XXX-XXX-XXX)',
    ),
  timeout: z
    .number()
    .int()
    .positive()
    .describe('Request timeout in milliseconds. Default: 5000')
    .optional(),
  identified: z
    .union([z.boolean(), z.record(z.string(), z.boolean())])
    .describe(
      'Identified or anonymous tracking. true (default) identifies every hit, false makes every hit anonymous (uia=1, dda=1, no _id, no uid). A consent object like { marketing: true } identifies a hit when any listed state is granted. Do not repeat these states in config.consent, or events are queued and never reach the destination.',
    )
    .optional(),
  customDimensions: CustomDimensionsSchema.describe(
    'Custom dimensions sent as dimension{id} on every hit, keyed by bare dimension id. Values are mapping values resolved against the event (like { "1": "data.size" }). Rule-level customDimensions win per key.',
  ).optional(),
  ip: InputSchema.describe(
    'Visitor IP, sent as cip. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. Kept on anonymous hits for country-level geolocation.',
  ).optional(),
  userAgent: InputSchema.describe(
    'User agent, sent as ua. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off.',
  ).optional(),
  language: InputSchema.describe(
    'Accept-Language value, sent as lang. Resolves against { ingest, event }. Default: ["ingest.language", "event.user.language"]. false switches it off.',
  ).optional(),
  pageUrl: InputSchema.describe(
    'Page URL, sent as url (required by the Tracking API, a hit without it is skipped). Resolves against { ingest, event }. Default: "event.source.url". false switches it off.',
  ).optional(),
  referrer: InputSchema.describe(
    'Referrer URL, sent as urlref. Resolves against { ingest, event }. Default: "event.source.referrer". false switches it off.',
  ).optional(),
  visitorId: InputSchema.describe(
    'Visitor id, sent as _id on identified hits. A 16-character hex value passes through, anything else is hashed to 16 hex (sha256). Resolves against { ingest, event }. Default: "event.user.device". false switches it off.',
  ).optional(),
  userId: InputSchema.describe(
    'User id, sent as uid on identified hits. Resolves against { ingest, event }. Default: "event.user.id". false switches it off.',
  ).optional(),
  pageViewId: InputSchema.describe(
    'Page view id, sent as pv_id (first 6 hex characters, else a 6-character hash). Resolves against { ingest, event }. Default: "event.source.trace", only for web events whose trace differs from the server collector trace. false switches it off.',
  ).optional(),
  timestamp: InputSchema.describe(
    'Event time in milliseconds, sent as cdt in UNIX seconds. Resolves against { ingest, event }. Default: "event.timestamp". false lets Piwik PRO use the receive time.',
  ).optional(),
});
