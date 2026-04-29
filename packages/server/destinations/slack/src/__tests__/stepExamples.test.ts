// Mock @slack/web-api so init() never tries to import the real SDK.
jest.mock('@slack/web-api', () => ({
  __esModule: true,
  WebClient: class {
    constructor() {}
  },
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Env, SlackClientMock, Settings } from '../types';

type Captured = [callable: string, ...args: unknown[]];

/**
 * Recording env -- both Web API mocks and sendServer log to a shared list.
 * sendServer captures the body as-is (already a JSON string).
 */
function spyEnv(): { env: Env; collected: () => Captured[] } {
  const calls: Captured[] = [];

  const slackClient: SlackClientMock = {
    chat: {
      postMessage: ((args: Record<string, unknown>) => {
        calls.push(['slackClient.chat.postMessage', args]);
        return Promise.resolve({
          ok: true,
          channel: 'CMOCK',
          ts: '1700000000.000100',
        }) as never;
      }) as never,
      postEphemeral: ((args: Record<string, unknown>) => {
        calls.push(['slackClient.chat.postEphemeral', args]);
        return Promise.resolve({ ok: true }) as never;
      }) as never,
    },
    conversations: {
      open: ((args: Record<string, unknown>) => {
        calls.push(['slackClient.conversations.open', args]);
        return Promise.resolve({
          ok: true,
          channel: { id: 'D-MOCK-DM' },
        }) as never;
      }) as never,
    },
  };

  const sendServer = ((...args: unknown[]) => {
    calls.push(['sendServer', ...args] as Captured);
    return Promise.resolve({ ok: true });
  }) as Env['sendServer'];

  return {
    env: { slackClient, sendServer },
    collected: () => calls,
  };
}

describe('slack server destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      command?: string;
      settings?: Partial<Settings>;
    };

    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    // Default: Web API mode with bot token + #default channel.
    // Step examples may override via `example.settings`.
    const baseSettings: Partial<Settings> = {
      token: 'xoxb-test',
      channel: '#default',
      ...(example.settings || {}),
    };

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env },
      {
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(collected()).toEqual(example.out);
  });
});
