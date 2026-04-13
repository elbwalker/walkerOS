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
 * Purchase notification -- Web API mode, channel from mapping override,
 * text template interpolated against event.data.
 */
export const purchaseAlert: SlackStepExample = {
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
    'slackClient.chat.postMessage',
    {
      channel: '#sales',
      text: ':moneybag: New order: ORD-500 - 299.99 EUR',
      unfurl_links: false,
      unfurl_media: false,
      mrkdwn: true,
    },
  ],
};

/**
 * Error alert -- routes to a different channel via mapping override.
 */
export const errorAlert: SlackStepExample = {
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
    'slackClient.chat.postMessage',
    {
      channel: '#engineering-alerts',
      text: ':rotating_light: Error: Payment gateway timeout',
      unfurl_links: false,
      unfurl_media: false,
      mrkdwn: true,
    },
  ],
};

/**
 * Welcome DM -- conversations.open(users) -> chat.postMessage(channel: D-id).
 */
export const welcomeDM: SlackStepExample = {
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
    'slackClient.chat.postMessage',
    {
      channel: '#sales',
      text: 'Checkout step: payment',
      thread_ts: '1700000000.000050',
      reply_broadcast: true,
      unfurl_links: false,
      unfurl_media: false,
      mrkdwn: true,
    },
  ],
};

/**
 * Ephemeral message -- visible to one user in the target channel.
 */
export const ephemeralMessage: SlackStepExample = {
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
    'slackClient.chat.postEphemeral',
    {
      channel: '#admin',
      user: 'U-ADMIN-1',
      text: 'Heads up: 5 requests remaining',
      unfurl_links: false,
      unfurl_media: false,
      mrkdwn: true,
    },
  ],
};

/**
 * Default blocks -- no custom text/blocks, destination auto-generates a
 * Block Kit message from the event data.
 */
export const defaultBlocks: SlackStepExample = {
  in: getEvent('lead submit', {
    timestamp: 1700000600,
    data: { name: 'Acme', email: 'sales@acme.test' },
    source: { type: 'server', id: 'crm', previous_id: '' },
  }),
  mapping: {
    settings: {
      channel: '#growth',
    },
  },
  out: [
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
};

/**
 * Webhook mode -- no token, just webhookUrl. The destination calls sendServer
 * with the JSON body. Channel is baked into the URL by Slack.
 */
export const deployNotification: SlackStepExample = {
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
    'sendServer',
    'https://hooks.slack.com/services/T00/B00/xxx',
    {
      text: ':rocket: Deployment complete: 1.4.2 to prod',
      unfurl_links: false,
      unfurl_media: false,
      mrkdwn: true,
    },
  ],
};
