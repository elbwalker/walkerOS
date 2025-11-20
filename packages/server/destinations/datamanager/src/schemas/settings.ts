import { z } from '@walkeros/core/schemas';
import {
  DestinationSchema,
  EventSourceSchema,
  ConsentSchema,
} from './primitives';

export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe(
      'OAuth 2.0 access token with datamanager scope (like ya29.c.xxx)',
    ),
  destinations: z
    .array(DestinationSchema)
    .min(1)
    .max(10)
    .describe(
      'Array of destination accounts and conversion actions/user lists (max 10)',
    ),
  eventSource: EventSourceSchema.describe(
    'Default event source if not specified per event (like WEB)',
  ).optional(),
  batchSize: z
    .number()
    .int()
    .min(1)
    .max(2000)
    .describe(
      'Maximum number of events to batch before sending (max 2000, like 100)',
    )
    .optional(),
  batchInterval: z
    .number()
    .int()
    .min(0)
    .describe(
      'Time in milliseconds to wait before auto-flushing batch (like 5000)',
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
    'Request-level consent for all events',
  ).optional(),
  testEventCode: z
    .string()
    .describe('Test event code for debugging (like TEST12345)')
    .optional(),
  logLevel: z
    .enum(['debug', 'info', 'warn', 'error', 'none'])
    .describe('Log level for debugging (debug shows all API calls)')
    .optional(),
  userData: z
    .record(z.string(), z.unknown())
    .describe(
      "Guided helper: User data mapping for all events (like { email: 'user.id', phone: 'data.phone' })",
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
});

export type Settings = z.infer<typeof SettingsSchema>;
