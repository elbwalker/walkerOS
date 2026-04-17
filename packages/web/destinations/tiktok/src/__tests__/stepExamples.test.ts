import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Settings, TTQ } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Wrap every method on the mock ttq with a spy that records
 * ['ttq.<method>', ...args] into a shared collector array.
 */
function spyTtq(env: Env): {
  env: Env;
  collected: () => CallRecord[];
} {
  const calls: CallRecord[] = [];
  const ttq = env.window.ttq;
  const methods: (keyof TTQ)[] = [
    'load',
    'page',
    'track',
    'identify',
    'enableCookie',
    'disableCookie',
  ];
  for (const m of methods) {
    (ttq as unknown as Record<string, unknown>)[m as string] = (
      ...args: unknown[]
    ) => {
      calls.push([`ttq.${String(m)}`, ...args]);
    };
  }
  return { env, collected: () => calls };
}

describe('tiktok destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
      configInclude?: string[];
    };

    // Fresh clone per test so mutations don't bleed across cases.
    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyTtq(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: 'test-pixel-id',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      await elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          consent: { marketing: true },
          include: example.configInclude,
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
          include: example.configInclude,
          settings: baseSettings,
          mapping: mappingConfig,
        },
      );
      await elb(event);
    }

    // Drop ttq.load — it's an init-time call, not part of per-push `out`.
    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().filter(([path]) => path !== 'ttq.load');

    expect(actual).toEqual(expected);
  });
});
