import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type SlackStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Slack server destination operates in two modes:
 *
 * 1. Web API mode - calls the injected `env.slackClient` SDK methods
 *    (`chat.postMessage`, `chat.postEphemeral`, `conversations.open`).
 *    Captured as `[callable, args]` with dotted callable names such as
 *    `'slackClient.chat.postMessage'`.
 *
 * 2. Webhook mode - calls `env.sendServer(url, JSON.stringify(body))`.
 *    Captured as `['sendServer', url, bodyAsString]` where `bodyAsString`
 *    is the already-stringified JSON body. Key insertion order in the
 *    source object matters for string equality.
 *
 * A single push may emit multiple calls (e.g. a DM opens a conversation
 * then posts to the returned channel id), so every `out` is wrapped as
 * `[[callable, ...args], ...]`.
 */

/**
 * Purchase notification -- Web API mode, channel from mapping override,
 * text template interpolated against event.data.
 */
export const purchaseAlert: SlackStepExample = {
  title: 'Purchase alert',
  description:
    'A completed order posts a templated message to a sales channel via the Slack Web API.',
  in: getEvent('order complete', {
    timestamp: 1700000100,
    data: {
      id: 'ORD-500',
      total: 299.99,
      currency: 'EUR',
      product: 'Pro Plan',
    },
    user: { id: 'buyer-42' },
  }),
  mapping: {
    settings: {
      channel: '#sales',
      text: ':moneybag: New order: ${data.id} - ${data.total} ${data.currency}',
    },
  },
  out: [
    [
      'slackClient.chat.postMessage',
      {
        channel: '#sales',
        text: ':moneybag: New order: ORD-500 - 299.99 EUR',
        unfurl_links: false,
        unfurl_media: false,
        mrkdwn: true,
      },
    ],
  ],
};

/**
 * Error alert -- routes to a different channel via mapping override.
 */
export const errorAlert: SlackStepExample = {
  title: 'Error alert',
  description:
    'An error event posts a critical alert to an engineering channel using a mapping-level channel override.',
  in: getEvent('error occur', {
    timestamp: 1700000200,
    data: {
      message: 'Payment gateway timeout',
      code: 'PGW_TIMEOUT',
      severity: 'critical',
    },
  }),
  mapping: {
    settings: {
      channel: '#engineering-alerts',
      text: ':rotating_light: Error: ${data.message}',
    },
  },
  out: [
    [
      'slackClient.chat.postMessage',
      {
        channel: '#engineering-alerts',
        text: ':rotating_light: Error: Payment gateway timeout',
        unfurl_links: false,
        unfurl_media: false,
        mrkdwn: true,
      },
    ],
  ],
};

/**
 * Welcome DM -- conversations.open(users) -> chat.postMessage(channel: D-id).
 */
export const welcomeDM: SlackStepExample = {
  title: 'Welcome DM',
  description:
    'A user signup opens a Slack DM channel and posts a welcome message with the selected plan.',
  in: getEvent('user signup', {
    timestamp: 1700000300,
    data: { plan: 'enterprise' },
    user: { id: 'U-NEW-USER' },
  }),
  mapping: {
    settings: {
      dm: true,
      user: 'U-NEW-USER',
      text: ':wave: Welcome aboard! You signed up for the ${data.plan} plan.',
    },
  },
  out: [
    ['slackClient.conversations.open', { users: 'U-NEW-USER' }],
    [
      'slackClient.chat.postMessage',
      {
        channel: 'D-MOCK-DM',
        text: ':wave: Welcome aboard! You signed up for the enterprise plan.',
        unfurl_links: false,
        unfurl_media: false,
        mrkdwn: true,
      },
    ],
  ],
};

/**
 * Threaded checkout step -- thread_ts override puts the reply into a thread.
 */
export const threadedCheckoutStep: SlackStepExample = {
  title: 'Threaded reply',
  description:
    'A checkout step posts as a threaded reply in Slack via thread_ts with broadcast to the channel.',
  in: getEvent('checkout step', {
    timestamp: 1700000400,
    data: { step: 'payment', sessionTs: '1700000000.000050' },
  }),
  mapping: {
    settings: {
      channel: '#sales',
      text: 'Checkout step: ${data.step}',
      threadTs: '1700000000.000050',
      replyBroadcast: true,
    },
  },
  out: [
    [
      'slackClient.chat.postMessage',
      {
        channel: '#sales',
        text: 'Checkout step: payment',
        unfurl_links: false,
        unfurl_media: false,
        mrkdwn: true,
        thread_ts: '1700000000.000050',
        reply_broadcast: true,
      },
    ],
  ],
};

/**
 * Ephemeral message -- visible to one user in the target channel.
 */
export const ephemeralMessage: SlackStepExample = {
  title: 'Ephemeral message',
  description:
    'A quota warning posts an ephemeral Slack message visible only to a target admin user.',
  in: getEvent('quota warning', {
    timestamp: 1700000500,
    data: { remaining: 5 },
  }),
  mapping: {
    settings: {
      channel: '#admin',
      ephemeral: true,
      user: 'U-ADMIN-1',
      text: 'Heads up: ${data.remaining} requests remaining',
    },
  },
  out: [
    [
      'slackClient.chat.postEphemeral',
      {
        channel: '#admin',
        text: 'Heads up: 5 requests remaining',
        unfurl_links: false,
        unfurl_media: false,
        mrkdwn: true,
        user: 'U-ADMIN-1',
      },
    ],
  ],
};

/**
 * Default blocks -- no custom text/blocks, destination auto-generates a
 * Block Kit message from the event data.
 */
export const defaultBlocks: SlackStepExample = {
  title: 'Default blocks',
  description:
    'With no custom text the destination auto-generates a Block Kit message from event data and source.',
  in: getEvent('lead submit', {
    timestamp: 1700000600,
    data: { name: 'Acme', email: 'sales@acme.test' },
    source: { type: 'crm', platform: 'server' },
  }),
  mapping: {
    settings: {
      channel: '#growth',
    },
  },
  out: [
    [
      'slackClient.chat.postMessage',
      {
        channel: '#growth',
        text: 'lead submit',
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'lead submit' },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: '*name:*\nAcme' },
              { type: 'mrkdwn', text: '*email:*\nsales@acme.test' },
            ],
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: 'Source: crm' }],
          },
        ],
        unfurl_links: false,
        unfurl_media: false,
        mrkdwn: true,
      },
    ],
  ],
};

/**
 * Webhook mode -- no token, just webhookUrl. The destination calls
 * `env.sendServer(url, JSON.stringify(body))`. Channel is baked into the
 * URL by Slack.
 */
export const deployNotification: SlackStepExample = {
  title: 'Webhook deploy',
  description:
    'Without a token the destination posts to an incoming Slack webhook URL with the rendered message body.',
  in: getEvent('deploy complete', {
    timestamp: 1700000700,
    data: { version: '1.4.2', environment: 'prod' },
  }),
  settings: {
    token: undefined,
    webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
  },
  mapping: {
    settings: {
      text: ':rocket: Deployment complete: ${data.version} to ${data.environment}',
    },
  },
  out: [
    [
      'sendServer',
      'https://hooks.slack.com/services/T00/B00/xxx',
      JSON.stringify({
        text: ':rocket: Deployment complete: 1.4.2 to prod',
        unfurl_links: false,
        unfurl_media: false,
        mrkdwn: true,
      }),
    ],
  ],
};
