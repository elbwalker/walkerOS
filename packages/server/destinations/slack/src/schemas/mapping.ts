import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  channel: z
    .string()
    .describe(
      'Override the destination channel for this rule. Web API mode only -- ignored in webhook mode.',
    )
    .optional(),
  text: z
    .string()
    .describe(
      'Override the text template for this rule. Supports `${data.field}` interpolation.',
    )
    .optional(),
  blocks: z
    .array(z.record(z.string(), z.unknown()))
    .describe('Override Block Kit blocks for this rule.')
    .optional(),
  threadTs: z
    .string()
    .describe('thread_ts for posting as a reply in a thread.')
    .optional(),
  replyBroadcast: z
    .boolean()
    .describe('Also broadcast the threaded reply back to the channel.')
    .optional(),
  ephemeral: z
    .boolean()
    .describe('Send via chat.postEphemeral. Requires `user`.')
    .optional(),
  user: z
    .string()
    .describe('Slack user ID for ephemeral or DM delivery.')
    .optional(),
  dm: z
    .boolean()
    .describe(
      'Send as DM via conversations.open + chat.postMessage. Requires `user`.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
