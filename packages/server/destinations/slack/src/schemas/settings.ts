import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    token: z
      .string()
      .startsWith('xoxb-')
      .describe(
        'Slack Bot token (xoxb-...). Enables Web API mode. Mutually exclusive with webhookUrl.',
      )
      .optional(),
    webhookUrl: z
      .string()
      .url()
      .describe(
        'Incoming Webhook URL. Enables webhook mode. Mutually exclusive with token.',
      )
      .optional(),
    channel: z
      .string()
      .describe(
        'Default Slack channel ID or name (e.g. "#alerts" or "C024BE91L"). Required for Web API mode unless every rule supplies one. Ignored in webhook mode.',
      )
      .optional(),
    text: z
      .string()
      .describe(
        'Default text template. Supports `${data.field}` interpolation against the walkerOS event.',
      )
      .optional(),
    blocks: z
      .array(z.record(z.string(), z.unknown()))
      .describe('Default Block Kit blocks applied when no mapping override is set.')
      .optional(),
    includeHeader: z
      .boolean()
      .describe(
        'Auto-add an event-name header block when generating default blocks. Default: true.',
      )
      .optional(),
    unfurlLinks: z
      .boolean()
      .describe('Enable link unfurling. Default: false (cleaner for automated alerts).')
      .optional(),
    unfurlMedia: z
      .boolean()
      .describe('Enable media unfurling. Default: false.')
      .optional(),
    mrkdwn: z
      .boolean()
      .describe('Use mrkdwn formatting in text. Default: true.')
      .optional(),
    threadTs: z
      .string()
      .describe('Static thread_ts for replies (rarely set at destination level).')
      .optional(),
    retryConfig: z
      .enum(['default', 'fiveRetriesInFiveMinutes', 'none'])
      .describe('Retry policy passed to WebClient. Default: "default".')
      .optional(),
  })
  .refine((v) => Boolean(v.token) !== Boolean(v.webhookUrl), {
    message: 'Provide exactly one of `token` or `webhookUrl`.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
