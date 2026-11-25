import { schemas, z } from '@walkeros/core/dev';
import { normalizers } from '../hash';
import { ActionSourceSchema } from './primitives';

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
        'Conversions API key from Ads Manager > Conversions (not the Advertiser API key), sent as Bearer token',
      ),
    pixelId: z
      .string()
      .min(1)
      .describe(
        'Pixel ID of the web data source, sent as the pid query parameter (like px_abc123)',
      ),
    action_source: ActionSourceSchema.describe(
      'Where the conversion happened: web, mobile_app, offline, physical_store, phone_call, email or other. Default: web. A web event needs a source URL. An action_source mapped in the rule data wins.',
    ).optional(),
    validate_only: z
      .boolean()
      .describe(
        'true: OpenAI validates each request and records nothing; validated events do not show in event monitoring (like true)',
      )
      .optional(),
    ...schemas.createHashSettingsSchema(Object.keys(normalizers)).shape,
    ip: InputSchema.describe(
      'Client IP, sent as user.ip_address. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped ip_address wins.',
    ).optional(),
    userAgent: InputSchema.describe(
      'Client user agent, sent as user.user_agent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped user_agent wins.',
    ).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
