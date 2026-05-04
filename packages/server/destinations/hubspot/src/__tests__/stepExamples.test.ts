jest.mock('@hubspot/api-client', () => ({
  __esModule: true,
  Client: class {
    constructor() {}
    events = {
      send: {
        basicApi: { send: () => Promise.resolve() },
        batchApi: { send: () => Promise.resolve() },
      },
    };
    crm = {
      contacts: {
        basicApi: { update: () => Promise.resolve() },
      },
    };
  },
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Env, HubSpotClientMock, Settings } from '../types';

type CallRecord = [callable: string, ...args: unknown[]];

/**
 * HubSpot wraps the `@hubspot/api-client` SDK. We build a fake client whose
 * methods push `[method.path, ...args]` onto a shared call log, then compare
 * against `example.out` which is always `[[callable, ...args], ...]`.
 *
 * No init-time calls to filter — the destination only touches the SDK when
 * an event is pushed and identity resolves.
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const client: HubSpotClientMock = {
    events: {
      send: {
        basicApi: {
          send: async (data) => {
            calls.push(['events.send.basicApi.send', data]);
          },
        },
        batchApi: {
          send: async (data) => {
            calls.push(['events.send.batchApi.send', data]);
          },
        },
      },
    },
    crm: {
      contacts: {
        basicApi: {
          update: async (id, data, idProperty) => {
            calls.push(['crm.contacts.basicApi.update', id, data, idProperty]);
          },
        },
      },
    },
  };

  return { env: { client }, collected: () => calls };
}

describe('hubspot server destination -- step examples', () => {
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

    const baseSettings: Partial<Settings> & {
      accessToken: string;
      eventNamePrefix: string;
    } = {
      accessToken: 'pat-test-xxx',
      eventNamePrefix: 'pe12345678_',
      email: 'user.email',
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
