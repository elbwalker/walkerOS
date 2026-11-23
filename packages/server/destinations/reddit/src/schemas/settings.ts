import { schemas, z } from '@walkeros/core/dev';
import { normalizers } from '../hash';
import { ActionSourceSchema } from './primitives';

const InputSchema = z.union([
  schemas.MappingSchemas.ValueSchema,
  z.literal(false),
]);

export const SettingsSchema = z
  .object({
    accessToken: z
      .string()
      .min(1)
      .describe(
        'Reddit Conversion Access Token for Bearer authentication (like rdt_ABC123...)',
      ),
    pixelId: z
      .string()
      .min(1)
      .describe(
        'Reddit Pixel ID used as the API path parameter (like a2_abcdef123456)',
      ),
    action_source: ActionSourceSchema.describe(
      'Channel of the conversion, sent as events[].action_source: WEBSITE, APP, PHYSICAL_STORE or OTHER (like WEBSITE). Reddit takes WEBSITE when it is unset',
    ).optional(),
    ...schemas.createHashSettingsSchema(Object.keys(normalizers)).shape,
    test_mode: z
      .boolean()
      .describe(
        'Enable test mode by sending test_mode: true in the request body (like true)',
      )
      .optional(),
    url: z
      .string()
      .url()
      .describe(
        'Custom base URL for the Reddit Conversions API, ending in /; the pixel ID is appended (like https://ads-api.reddit.com/api/v2.0/conversions/events/)',
      )
      .optional(),
    user_data: z
      .record(z.string(), z.string())
      .describe(
        "Mapping configuration for user fields (like { email: 'user.email', external_id: 'user.id' }). Only email, external_id, ip_address, phone_number, idfa and aaid are hashed; any other key is sent unhashed",
      )
      .optional(),
    ip: InputSchema.describe(
      'Client IP, sent as user.ip_address (hashed). Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped user.ip_address wins.',
    ).optional(),
    userAgent: InputSchema.describe(
      'Client user agent, sent as user.user_agent (as is, never hashed). Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped user.user_agent wins.',
    ).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
