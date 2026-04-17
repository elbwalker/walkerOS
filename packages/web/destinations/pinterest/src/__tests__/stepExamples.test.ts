/**
 * Pinterest destination — step examples runner.
 *
 * Every fixture in `examples.step` is a test case. The runner installs a
 * spy as `env.window.pintrk`, pushes the example event through a real
 * walkerOS collector, then asserts the recorded pintrk calls (filtering
 * out init-time load/page commands) match the example's `out` array.
 */

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Pintrk } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Install a spy on env.window.pintrk that records every call as a
 * CallRecord tuple (["window.pintrk", ...args]).
 */
function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const spy = ((...args: unknown[]) => {
    calls.push(['pintrk', ...args]);
  }) as unknown as Pintrk;
  spy.queue = [];
  spy.version = '3.0';
  env.window.pintrk = spy;
  return { env, collected: () => calls };
}

describe('pinterest destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
      command?: 'consent' | 'user' | 'config' | 'run';
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    if (example.command === 'consent') {
      await elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          consent: { marketing: true },
          settings: { apiKey: '2612345678901' },
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
          settings: { apiKey: '2612345678901' },
          mapping: mappingConfig,
        },
      );
      await elb(event);
    }

    // Drop init-time calls (load + page) — covered by init.test.ts.
    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().filter((call) => {
      const cmd = call[1];
      return cmd !== 'load' && cmd !== 'page';
    });

    expect(actual).toEqual(expected);
  });
});
