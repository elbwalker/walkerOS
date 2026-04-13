import { isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import type { Mapping, PushFn, Settings, SlackClientMock } from './types';
import { buildMessage } from './message';

export const push: PushFn = async function (event, ctx) {
  const { config, rule, env, logger } = ctx;
  const settings = config.settings as Settings;
  const ruleSettings = (rule?.settings || {}) as Partial<Mapping>;

  const message = buildMessage(event, settings, ruleSettings);

  // Webhook mode
  if (settings.webhookUrl) {
    return await pushWebhook(message, settings, env, logger);
  }

  // Web API mode
  return await pushWebApi(message, settings, ruleSettings, env, logger);
};

async function pushWebhook(
  message: { text?: string; blocks?: unknown[] },
  settings: Settings,
  env: { sendServer?: typeof sendServer } | undefined,
  logger: import('@walkeros/core').Logger.Instance,
): Promise<void> {
  if (!message.text && !message.blocks) {
    logger.warn('Slack message has no text or blocks; skipping');
    return;
  }

  const body = {
    ...(message.text ? { text: message.text } : {}),
    ...(message.blocks ? { blocks: message.blocks } : {}),
    unfurl_links: settings.unfurlLinks ?? false,
    unfurl_media: settings.unfurlMedia ?? false,
    mrkdwn: settings.mrkdwn ?? true,
  };

  const send = env?.sendServer || sendServer;
  const result = await send(
    settings.webhookUrl as string,
    JSON.stringify(body),
  );

  if (isObject(result) && result.ok === false) {
    logger.warn(`Slack webhook error: ${JSON.stringify(result)}`);
  }
}

async function pushWebApi(
  message: { text?: string; blocks?: unknown[] },
  settings: Settings,
  rule: Partial<Mapping>,
  env: { slackClient?: SlackClientMock } | undefined,
  logger: import('@walkeros/core').Logger.Instance,
): Promise<void> {
  const client =
    (env?.slackClient as SlackClientMock | undefined) ||
    (settings._client as unknown as SlackClientMock | undefined);

  if (!client) {
    logger.warn('Slack WebClient not initialized');
    return;
  }

  if (!message.text && !message.blocks) {
    logger.warn('Slack message has no text or blocks; skipping');
    return;
  }

  // Resolve target channel
  let channel = rule.channel ?? settings.channel;

  // DM path: open DM channel first
  if (rule.dm) {
    if (!rule.user) {
      logger.throw('Slack DM requires `mapping.settings.user`');
      return;
    }
    const opened = await client.conversations.open({ users: rule.user });
    const dmChannel = (
      opened as unknown as {
        channel?: { id?: string };
      }
    ).channel?.id;
    if (!dmChannel) {
      logger.warn('Slack conversations.open returned no channel id');
      return;
    }
    channel = dmChannel;
  }

  if (!channel) {
    logger.throw(
      'Slack push requires a channel (set settings.channel or mapping.settings.channel)',
    );
    return;
  }

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
    if (!rule.user) {
      logger.throw('Slack ephemeral requires `mapping.settings.user`');
      return;
    }
    await client.chat.postEphemeral({
      ...baseArgs,
      user: rule.user,
    } as never);
    return;
  }

  await client.chat.postMessage(baseArgs as never);
}
