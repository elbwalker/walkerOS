import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env } from '../types';

type CallRecord = [string, ...unknown[]];

function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const spy = (
    event: string,
    options?: { props?: Record<string, unknown> },
  ) => {
    const args: unknown[] = [event];
    if (options !== undefined) args.push(options);
    calls.push(['plausible', ...args]);
  };
  env.window.plausible = Object.assign(spy, {
    q: [] as IArguments[],
  }) as unknown as Env['window']['plausible'];
  return { env, collected: () => calls };
}

describe('plausible destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env: spiedEnv },
      { mapping: mappingConfig },
    );
    await elb(event);

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected();

    expect(actual).toEqual(expected);
  });
});
