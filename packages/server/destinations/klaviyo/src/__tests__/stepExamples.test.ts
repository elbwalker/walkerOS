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

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  // Single call: ['eventsApi.createEvent', {...}]
  if (typeof out[0] === 'string') return [out as CallRecord];
  // Multiple calls: [['profilesApi...', {...}], ['eventsApi...', {...}]]
  return out as CallRecord[];
}

/**
 * Builds a recording Env where every API method appends to a shared
 * call log as ['className.method', params].
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

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const expected = flatten(example.out as ExpectedOut);
    const actual = collected();

    expect(actual).toEqual(expected);
  });
});
