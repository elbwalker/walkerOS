import { schemas, z } from '@walkeros/core/dev';

const InputSchema = z.union([
  schemas.MappingSchemas.ValueSchema,
  z.literal(false),
]);

export const SettingsSchema = z
  .object({
    apiKey: z
      .string()
      .min(1)
      .describe(
        'Gravity API key from Settings > Organization (owner or admin), sent as Bearer token (like grv_...)',
      ),
    action_source: z
      .string()
      .min(1)
      .describe(
        'Where the conversion happened. Default: website (like website)',
      )
      .optional(),
    test_event_code: z
      .string()
      .describe(
        'Test event code from Events Manager > Set up tracking: events are validated, not recorded (like TEST123)',
      )
      .optional(),
    url: z
      .string()
      .url()
      .describe('Endpoint (like https://api.trygravity.com/gateway/events)')
      .optional(),
    ip: InputSchema.describe(
      'Client IP, sent as user_data.client_ip_address. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped ip_address wins.',
    ).optional(),
    userAgent: InputSchema.describe(
      'Client user agent, sent as user_data.client_user_agent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped user_agent wins.',
    ).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
