jest.mock('klaviyo-api', () => ({
  __esModule: true,
  ApiKeySession: class {
    constructor() {}
  },
  EventsApi: class {
    constructor() {}
    createEvent() {
      return Promise.resolve({});
    }
  },
  ProfilesApi: class {
    constructor() {}
    createOrUpdateProfile() {
      return Promise.resolve({});
    }
  },
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type {
  Env,
  KlaviyoEventsApiMock,
  KlaviyoProfilesApiMock,
  Settings,
} from '../types';

type CallRecord = [callable: string, ...args: unknown[]];

/**
 * Klaviyo wraps the `klaviyo-api` SDK. We build fake api instances whose
 * methods push `[method.path, ...args]` onto a shared call log, then compare
 * against `example.out` which is always `[[callable, ...args], ...]`.
 *
 * No init-time calls to filter — the destination only touches the SDK when
 * an event is pushed and identity resolves.
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const eventsApi: KlaviyoEventsApiMock = {
    createEvent: async (params) => {
      calls.push(['eventsApi.createEvent', params]);
      return {};
    },
  };

  const profilesApi: KlaviyoProfilesApiMock = {
    createOrUpdateProfile: async (params) => {
      calls.push(['profilesApi.createOrUpdateProfile', params]);
      return {};
    },
  };

  return { env: { eventsApi, profilesApi }, collected: () => calls };
}

describe('klaviyo server destination -- step examples', () => {
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
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: 'pk_test_key',
      email: 'user.email',
      externalId: 'user.id',
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
