import { StepError } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import type {
  Mapping,
  PushFn,
  Settings,
  SlackBlock,
  SlackClientMock,
} from './types';
import { buildMessage } from './message';

/** What a message carries: the text, the blocks, or both. */
type Content =
  | { blocks: SlackBlock[]; text?: string }
  | { text: string; blocks?: SlackBlock[] };

/** The thread fields Slack accepts together. */
type Thread =
  | { thread_ts: string; reply_broadcast: true }
  | { thread_ts?: string };

// A silent rule has no Slack message of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (event, ctx) {
  const { config, rule, env } = ctx;
  const settings = config.settings!;
  const ruleSettings: Partial<Mapping> = rule?.settings || {};

  const message = buildMessage(event, settings, ruleSettings);

  // A message without text and blocks has nothing to show in Slack.
  const content: Content | undefined = message.blocks
    ? { blocks: message.blocks, text: message.text }
    : message.text
      ? { text: message.text }
      : undefined;
  if (!content)
    throw new StepError('Slack message has no text or blocks', {
      code: 'missing-input',
    });

  // Webhook mode
  if (settings.webhookUrl) {
    await pushWebhook(content, settings, settings.webhookUrl, env);
  } else {
    // Web API mode
    await pushWebApi(content, settings, ruleSettings, env);
  }
};

async function pushWebhook(
  message: Content,
  settings: Settings,
  webhookUrl: string,
  env: { sendServer?: typeof sendServer } | undefined,
): Promise<void> {
  const body = {
    ...(message.text ? { text: message.text } : {}),
    ...(message.blocks ? { blocks: message.blocks } : {}),
    unfurl_links: settings.unfurlLinks ?? false,
    unfurl_media: settings.unfurlMedia ?? false,
    mrkdwn: settings.mrkdwn ?? true,
  };

  const send = env?.sendServer || sendServer;
  await send(webhookUrl, JSON.stringify(body));
}

async function pushWebApi(
  message: Content,
  settings: Settings,
  rule: Partial<Mapping>,
  env: { slackClient?: SlackClientMock } | undefined,
): Promise<void> {
  const client = env?.slackClient || settings._client;

  if (!client)
    throw new StepError('Slack WebClient not initialized', {
      code: 'not-ready',
    });

  // Resolve target channel
  let channel = rule.channel ?? settings.channel;

  // DM path: open DM channel first
  if (rule.dm) {
    if (!rule.user)
      throw new StepError('Slack DM requires `mapping.settings.user`', {
        code: 'config',
      });
    const opened = await client.conversations.open({ users: rule.user });
    const dmChannel = opened.channel?.id;
    if (!dmChannel)
      throw new StepError('Slack conversations.open returned no channel id', {
        code: 'transport',
        retryable: false,
      });
    channel = dmChannel;
  }

  if (!channel)
    throw new StepError(
      'Slack push requires a channel (set settings.channel or mapping.settings.channel)',
      { code: 'config' },
    );

  const threadTs = rule.threadTs ?? settings.threadTs;
  // A broadcast only means something on a thread reply.
  const thread: Thread = threadTs
    ? rule.replyBroadcast
      ? { thread_ts: threadTs, reply_broadcast: true }
      : { thread_ts: threadTs }
    : {};
  const baseArgs = {
    channel,
    ...message,
    unfurl_links: settings.unfurlLinks ?? false,
    unfurl_media: settings.unfurlMedia ?? false,
    mrkdwn: settings.mrkdwn ?? true,
    ...thread,
  };

  // Ephemeral path
  if (rule.ephemeral) {
    if (!rule.user)
      throw new StepError('Slack ephemeral requires `mapping.settings.user`', {
        code: 'config',
      });
    await client.chat.postEphemeral({
      ...baseArgs,
      user: rule.user,
    });
  } else {
    await client.chat.postMessage(baseArgs);
  }
}
