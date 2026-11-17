import { schemas, z } from '@walkeros/core/dev';
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
        'Conversions API key from Ads Manager > Conversions, sent as Bearer token (like sk-ads-...)',
      ),
    pixelId: z
      .string()
      .min(1)
      .describe(
        'Pixel ID of the web data source, sent as the pid query parameter (like px_abc123)',
      ),
    action_source: ActionSourceSchema.describe(
      'Where the conversion happened: web, app or offline. Default: web. A web event needs a source URL.',
    ).optional(),
    validate_only: z
      .boolean()
      .describe(
        'true: OpenAI validates the request and records nothing (like true)',
      )
      .optional(),
    integration_source: z
      .string()
      .describe('Label of the sending integration (like walkerOS)')
      .optional(),
    url: z
      .string()
      .url()
      .describe(
        'Endpoint without query string; pid is appended (like https://bzr.openai.com/v1/events)',
      )
      .optional(),
    ip: InputSchema.describe(
      'Client IP, sent as user.ip_address. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped ip_address wins.',
    ).optional(),
    userAgent: InputSchema.describe(
      'Client user agent, sent as user.user_agent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped user_agent wins.',
    ).optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
