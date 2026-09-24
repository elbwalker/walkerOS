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
      'Long-lived Bing UET CAPI access token from Microsoft Advertising',
    ),
  tagId: z.string().min(1).describe('Microsoft Advertising UET tag ID'),
  url: z
    .string()
    .url()
    .describe(
      'Custom Bing UET CAPI base URL (default https://capi.uet.microsoft.com/v1/)',
    )
    .optional(),
  doNotHash: z
    .array(z.string())
    .describe("User data fields to skip hashing (like ['em', 'ph'])")
    .optional(),
  user_data: z
    .record(z.string(), z.string())
    .describe("Mapping for user data fields (like { em: 'user.email' })")
    .optional(),
  dataProvider: z
    .string()
    .describe('Identifier of the data source (default "walkerOS")')
    .optional(),
  continueOnValidationError: z
    .boolean()
    .describe(
      'When true, Microsoft continues to ingest events despite validation errors',
    )
    .optional(),
  ip: InputSchema.describe(
    'Client IP, sent as userData.clientIpAddress. Resolves against { ingest, event }. Default: ["ingest.ip", "event.user.ip"]. false switches it off. A mapped userData.clientIpAddress wins.',
  ).optional(),
  userAgent: InputSchema.describe(
    'Client user agent, sent as userData.clientUserAgent. Resolves against { ingest, event }. Default: ["ingest.userAgent", "event.user.userAgent"]. false switches it off. A mapped userData.clientUserAgent wins.',
  ).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
