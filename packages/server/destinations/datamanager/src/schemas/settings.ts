import { schemas, z } from '@walkeros/core/dev';
import {
  DestinationSchema,
  EventSourceSchema,
  ConsentSchema,
} from './primitives';

const InputSchema = z.union([
  schemas.MappingSchemas.ValueSchema,
  z.literal(false),
]);

/**
 * Service account credentials schema
 */
const CredentialsSchema = z.object({
  client_email: z.string().email().describe('Service account email'),
  private_key: z
    .string()
    .min(1)
    .describe('Service account private key (PEM format)'),
});

export const SettingsSchema = z
  .object({
    credentials: CredentialsSchema.optional().describe(
      'Service account credentials (client_email + private_key). Prefer config.credentials; set here, they are used and the destination logs a WARN line.',
    ),
    keyFilename: z
      .string()
      .optional()
      .describe('Absolute path to a service account JSON file'),
    scopes: z
      .array(z.string())
      .optional()
      .describe(
        'OAuth scopes for Data Manager API. Defaults to datamanager scope.',
      ),
    destinations: z
      .array(DestinationSchema)
      .min(1)
      .max(10)
      .describe(
        'Destination accounts and conversion actions (max 10); every event goes to every entry',
      ),
    eventSource: EventSourceSchema.optional()
      .default('WEB')
      .describe(
        'Event source for all events. Defaults to WEB. Values: WEB, APP, IN_STORE, PHONE, MESSAGE, OTHER',
      ),
    validateOnly: z
      .boolean()
      .describe('If true, validate request without ingestion (testing mode)')
      .optional(),
    url: z
      .string()
      .url()
      .describe(
        'Override API endpoint for testing (like https://datamanager.googleapis.com/v1)',
      )
      .optional(),
    consent: ConsentSchema.describe(
      'Request-level consent, sent with every request and applied to each event that carries no consent of its own',
    ).optional(),
    userData: z
      .record(z.string(), z.unknown())
      .describe(
        "Guided helper: User data mapping for all events (like { email: 'user.email', phone: 'data.phone' })",
      )
      .optional(),
    userId: z
      .any()
      .describe(
        "Guided helper: First-party user ID for all events (like 'user.id')",
      )
      .optional(),
    clientId: z
      .any()
      .describe(
        'Guided helper: Google Analytics client ID of the web stream, the one your Google tag sets, for all events',
      )
      .optional(),
    appInstanceId: z
      .any()
      .describe(
        "Guided helper: GA4 app instance ID (Firebase) for all events (like 'user.appInstanceId')",
      )
      .optional(),
    sessionAttributes: z
      .any()
      .describe(
        "Guided helper: Privacy-safe attribution for all events (like 'context.sessionAttributes')",
      )
      .optional(),
    consentAdUserData: z
      .union([z.string(), z.boolean()])
      .describe(
        "Consent mapping: Field name from event.consent (like 'marketing') or static boolean value",
      )
      .optional(),
    consentAdPersonalization: z
      .union([z.string(), z.boolean()])
      .describe(
        "Consent mapping: Field name from event.consent (like 'targeting') or static boolean value",
      )
      .optional(),
    ip: InputSchema.describe(
      'Client IP, sent as eventDeviceInfo.ipAddress. Resolves against { ingest, event }. Filled by default only when an entry is GOOGLE_ADS, from ["ingest.ip", "event.user.ip"]; a Google Analytics-only step sends none unless this is set or ipAddress is mapped. false switches it off. A mapped ipAddress wins.',
    ).optional(),
    userAgent: InputSchema.describe(
      'Client user agent, sent as eventDeviceInfo.userAgent. Resolves against { ingest, event }. Filled by default only when an entry is GOOGLE_ADS, from ["ingest.userAgent", "event.user.userAgent"]; a Google Analytics-only step sends none unless this is set or userAgent is mapped. false switches it off. A mapped userAgent wins.',
    ).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
