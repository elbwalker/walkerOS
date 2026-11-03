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
      .describe(
        'Path to service account JSON file. For local development or environments with filesystem access.',
      ),
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
        'Array of destination accounts and conversion actions (max 10)',
      ),
    eventSource: EventSourceSchema.optional()
      .default('WEB')
      .describe(
        'Event source for all events. Defaults to WEB. Values: WEB, APP, IN_STORE, PHONE, OTHER',
      ),
    batchSize: z
      .number()
      .int()
      .min(1)
      .max(2000)
      .describe(
        'Has no effect: every event is sent in its own request (accepts 1 to 2000)',
      )
      .optional(),
    batchInterval: z
      .number()
      .int()
      .min(0)
      .describe(
        'Has no effect: every event is sent in its own request (accepts milliseconds, like 5000)',
      )
      .optional(),
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
    testEventCode: z
      .string()
      .describe('Test event code for debugging (like TEST12345)')
      .optional(),
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
        "Guided helper: GA4 client ID for all events (like 'user.device')",
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
      'Client IP, sent as eventDeviceInfo.ipAddress. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped ipAddress wins.',
    ).optional(),
    userAgent: InputSchema.describe(
      'Client user agent, sent as eventDeviceInfo.userAgent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped userAgent wins.',
    ).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
