import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Snowplow's queue API is `window.snowplow(method, ...args)`. We record
 * each call as `['snowplow.<method>', ...args]` — matching the dotted
 * SDK-namespace convention used by amplitude/tiktok step examples.
 */
function spySnowplow(env: Env): {
  env: Env;
  collected: () => CallRecord[];
} {
  const calls: CallRecord[] = [];
  env.window.snowplow = ((...args: unknown[]) => {
    const [method, ...rest] = args;
    if (typeof method !== 'string') return;
    calls.push([`snowplow.${method}`, ...rest]);
  }) as Env['window']['snowplow'];
  return { env, collected: () => calls };
}

describe('snowplow destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
      command?: 'consent' | 'user' | 'config' | 'run';
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spySnowplow(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { collectorUrl: string } = {
      collectorUrl: 'https://collector.example.com',
      pageViewEvent: 'page view',
    };

    if (example.command === 'consent') {
      await elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          settings: baseSettings,
        },
      );
      await elb('walker consent', example.in as WalkerOS.Consent);
    } else {
      const event = example.in as WalkerOS.Event;
      const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
      const mappingConfig = mapping
        ? { [event.entity]: { [event.action]: mapping } }
        : undefined;

      await elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          settings: baseSettings,
          mapping: mappingConfig,
        },
      );
      await elb(event);
    }

    // Drop init-time calls — every example triggers newTracker once
    // and it's not part of `out`.
    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().filter(
      ([path]) => path !== 'snowplow.newTracker',
    );

    expect(actual).toEqual(expected);
  });
});
