import { StepError } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import type { Mapping, PushFn, Settings, SlackClientMock } from './types';
import { buildMessage } from './message';

// A silent rule has no Slack message of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (event, ctx) {
  const { config, rule, env } = ctx;
  const settings = config.settings as Settings;
  const ruleSettings = (rule?.settings || {}) as Partial<Mapping>;

  const message = buildMessage(event, settings, ruleSettings);

  // A message without text and blocks has nothing to show in Slack.
  if (!message.text && !message.blocks)
    throw new StepError('Slack message has no text or blocks', {
      code: 'missing-input',
    });

  // Webhook mode
  if (settings.webhookUrl) {
    await pushWebhook(message, settings, env);
  } else {
    // Web API mode
    await pushWebApi(message, settings, ruleSettings, env);
  }
};

async function pushWebhook(
  message: { text?: string; blocks?: unknown[] },
  settings: Settings,
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
  await send(settings.webhookUrl as string, JSON.stringify(body));
}

async function pushWebApi(
  message: { text?: string; blocks?: unknown[] },
  settings: Settings,
  rule: Partial<Mapping>,
  env: { slackClient?: SlackClientMock } | undefined,
): Promise<void> {
  const client =
    (env?.slackClient as SlackClientMock | undefined) ||
    (settings._client as unknown as SlackClientMock | undefined);

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
    const dmChannel = (
      opened as unknown as {
        channel?: { id?: string };
      }
    ).channel?.id;
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

  const baseArgs: Record<string, unknown> = {
    channel,
    ...(message.text ? { text: message.text } : {}),
    ...(message.blocks ? { blocks: message.blocks } : {}),
    unfurl_links: settings.unfurlLinks ?? false,
    unfurl_media: settings.unfurlMedia ?? false,
    mrkdwn: settings.mrkdwn ?? true,
  };

  if (rule.threadTs ?? settings.threadTs) {
    baseArgs.thread_ts = rule.threadTs ?? settings.threadTs;
  }
  if (rule.replyBroadcast) baseArgs.reply_broadcast = true;

  // Ephemeral path
  if (rule.ephemeral) {
    if (!rule.user)
      throw new StepError('Slack ephemeral requires `mapping.settings.user`', {
        code: 'config',
      });
    await client.chat.postEphemeral({
      ...baseArgs,
      user: rule.user,
    } as never);
  } else {
    await client.chat.postMessage(baseArgs as never);
  }
}
