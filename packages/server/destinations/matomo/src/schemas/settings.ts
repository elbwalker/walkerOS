import { schemas, z } from '@walkeros/core/dev';

const { ValueSchema, ValueConfigSchema } = schemas;

const InputSchema = z.union([ValueSchema, z.literal(false)]);

const TargetSchema = z.union([z.string().min(1), ValueConfigSchema]);

export const CustomDimensionsSchema = z.record(
  z.string().regex(/^\d+$/, 'Dimension keys are bare numeric ids like "1"'),
  ValueSchema,
);

export const SettingsSchema = z
  .object({
    url: TargetSchema.describe(
      'Base URL of your Matomo, normalized to one trailing slash; hits go to <url>matomo.php (like https://matomo.example.com/). A string is the URL itself; a mapping value config resolves per event against { ingest, event }',
    ),
    siteId: z
      .union([TargetSchema, z.number().int().positive()])
      .describe(
        'Matomo site ID, a positive integer, sent as idsite. A string or number is the ID itself; a mapping value config resolves per event against { ingest, event }, so one step can serve several sites',
      ),
    ip: InputSchema.describe(
      'Visitor IP, sent as cip; needs credentials.token. Resolves against { ingest, event }, like ["ingest.ip", "event.user.ip"]. No default: Matomo then sees the collector IP',
    ).optional(),
    userAgent: InputSchema.describe(
      'User agent, sent as ua. Resolves against { ingest, event }, like ["ingest.userAgent", "event.user.userAgent"]. No default: Matomo then sees the collector user agent',
    ).optional(),
    language: InputSchema.describe(
      'Accept-Language value, sent as lang. Resolves against { ingest, event }. Default: ["ingest.language", "event.user.language"]. false switches it off.',
    ).optional(),
    pageUrl: InputSchema.describe(
      'Page URL, sent as url. Resolves against { ingest, event }. Default: "event.source.url". false switches it off.',
    ).optional(),
    referrer: InputSchema.describe(
      'Referrer URL, sent as urlref. Resolves against { ingest, event }. Default: "event.source.referrer". false switches it off.',
    ).optional(),
    visitorId: InputSchema.describe(
      'Visitor ID, sent as cid, the forced visitor ID Matomo matches visitors by; a 16-character lowercase hex value passes through, anything else is hashed to 16 hex (sha256). Default: event.user.device. false switches it off',
    ).optional(),
    userId: InputSchema.describe(
      'User ID, sent as uid. No default. With uid Matomo uses a hash of the user ID as the visitor ID instead of cid and may join a first identified hit to another visitor visit by its fingerprint, so set it together with ip, credentials.token and userAgent. Like "event.user.id"',
    ).optional(),
    screenSize: InputSchema.describe(
      'Screen size, sent as res as WxH (like 1920x1080); any other value is not sent and reported. Resolves against { ingest, event }. Default: "event.user.screenSize". false switches it off.',
    ).optional(),
    pageViewId: InputSchema.describe(
      'Page view ID, sent as pv_id (first 6 hex characters, else a 6-character hash). Resolves against { ingest, event }. Default: "event.source.trace", only for web events whose trace differs from the server collector trace. false switches it off.',
    ).optional(),
    timestamp: InputSchema.describe(
      'Event time in milliseconds, sent as cdt in UNIX seconds; a cdt older than 24 hours needs credentials.token, else Matomo refuses the request. Resolves against { ingest, event }. Default: "event.timestamp". false lets Matomo use the receive time.',
    ).optional(),
    customDimensions: CustomDimensionsSchema.describe(
      'Custom dimensions applied to every hit, keyed by bare dimension id (like { "1": "data.userType" }). Each value is resolved per event. Rule-level customDimensions win per key.',
    ).optional(),
  })
  .strict();
