import { schemas, z } from '@walkeros/core/dev';

const InputSchema = z.union([
  schemas.MappingSchemas.ValueSchema,
  z.literal(false),
]);

export const SettingsSchema = z.object({
  pixelCode: z
    .string()
    .min(1)
    .describe('TikTok Pixel Code from Events Manager (like C0ABCDEF12345)'),
  accessToken: z
    .string()
    .min(1)
    .describe('Events API access token from TikTok Events Manager'),
  url: z.string().url().describe('Custom Events API endpoint URL').optional(),
  test_event_code: z
    .string()
    .describe(
      'Test event code for debugging in TikTok Events Manager (like TEST12345)',
    )
    .optional(),
  doNotHash: z
    .array(z.string())
    .describe(
      "User data fields to skip hashing (like ['email', 'phone_number'])",
    )
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe("Mapping for user data fields (like { email: 'user.email' })")
    .optional(),
  partner_name: z
    .string()
    .describe('Partner name for TikTok attribution')
    .optional(),
  ip: InputSchema.describe(
    'Client IP, sent as context.ip. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off.',
  ).optional(),
  userAgent: InputSchema.describe(
    'Client user agent, sent as context.user_agent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off.',
  ).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
