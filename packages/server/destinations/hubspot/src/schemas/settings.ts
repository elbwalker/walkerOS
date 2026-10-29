import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    accessToken: z
      .string()
      .min(1)
      .describe(
        'HubSpot private app access token. Create one in HubSpot Settings > Integrations > Private Apps. Requires analytics.behavioral_events.send scope.',
      ),
    eventNamePrefix: z
      .string()
      .min(1)
      .describe(
        'Fully qualified event name prefix: pe{HubID}_ (e.g. pe12345678_). Find it in HubSpot under Data Management > Custom Events.',
      ),
    email: z
      .string()
      .describe(
        'walkerOS mapping value path to resolve contact email from events (like user.email). Default: user.email. An event needs an email or an objectId.',
      )
      .optional(),
    objectId: z
      .string()
      .describe(
        'walkerOS mapping value path to resolve HubSpot CRM objectId from events. Alternative to email for contact association.',
      )
      .optional(),
    identify: z
      .unknown()
      .describe(
        'Destination-level contact update mapping. Resolves to { email, properties } and updates the contact with that email (not an upsert). Fires on first push and re-fires when values change.',
      )
      .optional(),
    defaultProperties: z
      .record(z.string(), z.string())
      .describe(
        'Static event properties added to every event occurrence. Useful for hs_touchpoint_source, hs_page_content_type, etc.',
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
