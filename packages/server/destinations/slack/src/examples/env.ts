import type { Env, SlackClientMock } from '../types';

const okMessageResponse = {
  ok: true as const,
  channel: 'CMOCK',
  ts: '1700000000.000100',
};

const okEphemeralResponse = { ok: true as const };

const okOpenResponse = {
  ok: true as const,
  channel: { id: 'D-MOCK-DM' },
};

function createMockClient(): SlackClientMock {
  return {
    chat: {
      postMessage: () => Promise.resolve(okMessageResponse as never),
      postEphemeral: () => Promise.resolve(okEphemeralResponse as never),
    },
    conversations: {
      open: () => Promise.resolve(okOpenResponse as never),
    },
  };
}

export const push: Env = {
  slackClient: createMockClient(),
  sendServer: (() =>
    Promise.resolve({ ok: true } as never)) as Env['sendServer'],
};

export const simulation = [
  'call:slackClient.chat.postMessage',
  'call:slackClient.chat.postEphemeral',
  'call:slackClient.conversations.open',
  'call:sendServer',
];
