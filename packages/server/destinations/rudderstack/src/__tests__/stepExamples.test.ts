jest.mock('@rudderstack/rudder-sdk-node', () => {
  return class {
    constructor() {}
    track() {}
    identify() {}
    group() {}
    page() {}
    screen() {}
    alias() {}
    flush() {
      return Promise.resolve();
    }
  };
});

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Env, RudderStackAnalyticsMock, Settings } from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  // Single call: ['analytics.track', {...}]
  if (typeof out[0] === 'string') return [out as CallRecord];
  // Multiple calls: [['analytics.identify', {...}], ['analytics.track', {...}]]
  return out as CallRecord[];
}

/**
 * Builds a recording Env where every SDK method appends to a shared
 * call log as ['analytics.method', params].
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const analytics: RudderStackAnalyticsMock = {
    track: (params) => {
      calls.push(['analytics.track', params]);
    },
    identify: (params) => {
      calls.push(['analytics.identify', params]);
    },
    group: (params) => {
      calls.push(['analytics.group', params]);
    },
    page: (params) => {
      calls.push(['analytics.page', params]);
    },
    screen: (params) => {
      calls.push(['analytics.screen', params]);
    },
    alias: (params) => {
      calls.push(['analytics.alias', params]);
    },
    flush: () => Promise.resolve(),
  };

  return { env: { analytics }, collected: () => calls };
}

describe('rudderstack server destination -- step examples', () => {
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

    const baseSettings: Partial<Settings> & {
      writeKey: string;
      dataPlaneUrl: string;
    } = {
      writeKey: 'test-write-key',
      dataPlaneUrl: 'https://test.rudderstack.com',
      userId: 'user.id',
      anonymousId: 'user.session',
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
