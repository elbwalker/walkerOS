import { schemas, z } from '@walkeros/core/dev';

const InputSchema = z.union([
  schemas.MappingSchemas.ValueSchema,
  z.literal(false),
]);

export const SettingsSchema = z.object({
  accessToken: z
    .string()
    .min(1)
    .describe(
      'Long-lived Conversions API access token from Snapchat Ads Manager',
    ),
  pixelId: z.string().min(1).describe('Snap Pixel ID'),
  url: z
    .string()
    .url()
    .describe(
      'Custom Conversions API base URL (default https://tr.snapchat.com/v3/)',
    )
    .optional(),
  action_source: z
    .enum(['WEB', 'MOBILE_APP', 'OFFLINE'])
    .describe('Event action source (default WEB)')
    .optional(),
  doNotHash: z
    .array(z.string())
    .describe("User data fields to skip hashing (like ['em', 'ph'])")
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe("Mapping for user data fields (like { em: 'user.email' })")
    .optional(),
  testMode: z
    .boolean()
    .describe(
      'When true, sends events to /events/validate instead of /events for testing',
    )
    .optional(),
  ip: InputSchema.describe(
    'Client IP, sent as user_data.client_ip_address. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped user_data.client_ip_address wins.',
  ).optional(),
  userAgent: InputSchema.describe(
    'Client user agent, sent as user_data.client_user_agent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped user_data.client_user_agent wins.',
  ).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
