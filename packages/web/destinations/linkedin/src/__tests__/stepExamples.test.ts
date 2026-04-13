/**
 * LinkedIn destination — step examples runner.
 *
 * Every fixture in `examples.step` is a test case. The runner installs a
 * spy as `env.window.lintrk`, pushes the example event through a real
 * walkerOS collector, then asserts the recorded lintrk calls match the
 * example's `out` array.
 *
 * The LinkedIn destination has no npm SDK to stub — unlike clarity's
 * `jest.mock('@microsoft/clarity', ...)` — so no module-level mock is
 * needed. We drive everything through `env.window.lintrk`.
 */

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Lintrk, Settings } from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  // Single call: out[0] is a string (the dotted path, e.g. "lintrk")
  if (typeof out[0] === 'string') return [out as CallRecord];
  // Multi-call: array of [path, ...args] tuples
  return out as CallRecord[];
}

/**
 * Install a spy on env.window.lintrk. The spy records every call prefixed
 * with the dotted path `lintrk` so assertions can compare directly against
 * example `out` shapes.
 */
function spyEnv(env: Env): {
  env: Env;
  collected: () => CallRecord[];
} {
  const calls: CallRecord[] = [];
  const lintrk = ((action: string, data: unknown) => {
    calls.push(['lintrk', action, data]);
  }) as unknown as Lintrk;
  lintrk.q = [];
  env.window.lintrk = lintrk;
  return { env, collected: () => calls };
}

describe('linkedin destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: '123456',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      // Not currently used by LinkedIn fixtures.
      await elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        { settings: baseSettings, consent: { marketing: true } },
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

    const expected = flatten(example.out as ExpectedOut);
    const actual = collected();

    expect(actual).toEqual(expected);
  });
});
