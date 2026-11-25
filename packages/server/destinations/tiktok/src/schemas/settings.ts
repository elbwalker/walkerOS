import { schemas, z } from '@walkeros/core/dev';
import { doNotHashKeys } from '../hash';

const InputSchema = z.union([
  schemas.MappingSchemas.ValueSchema,
  z.literal(false),
]);

export const SettingsSchema = z
  .object({
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
    ...schemas.createHashSettingsSchema(doNotHashKeys).shape,
    user_data: z
      .record(z.string(), z.string())
      .describe("Mapping for user data fields (like { email: 'user.email' })")
      .optional(),
    partner_name: z
      .string()
      .describe('Partner name for TikTok attribution (default walkerOS)')
      .optional(),
    ip: InputSchema.describe(
      'Client IP, sent as user.ip. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off.',
    ).optional(),
    userAgent: InputSchema.describe(
      'Client user agent, sent as user.user_agent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off.',
    ).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
