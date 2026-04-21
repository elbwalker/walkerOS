jest.mock('@segment/analytics-node', () => ({
  __esModule: true,
  Analytics: class {
    constructor() {}
    track() {}
    identify() {}
    group() {}
    page() {}
    screen() {}
    closeAndFlush() {
      return Promise.resolve();
    }
  },
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Env, SegmentAnalyticsMock, Settings } from '../types';

type Captured = [callable: string, ...args: unknown[]];

/**
 * Builds a recording Env where every SDK method appends to a shared
 * call log as ['analytics.method', params].
 */
function spyEnv(): { env: Env; collected: () => Captured[] } {
  const calls: Captured[] = [];

  const analytics: SegmentAnalyticsMock = {
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
    closeAndFlush: () => Promise.resolve(),
  };

  return { env: { analytics }, collected: () => calls };
}

describe('segment server destination -- step examples', () => {
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

    const baseSettings: Partial<Settings> & { writeKey: string } = {
      writeKey: 'test-write-key',
      userId: 'user.id',
      anonymousId: 'user.session',
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
