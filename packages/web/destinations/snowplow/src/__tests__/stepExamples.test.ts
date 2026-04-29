import type {
  Destination,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env } from '../types';

type CallRecord = [string, ...unknown[]];

const initConfig = examples.step.init.in as Destination.Config;
const initOut = (examples.step.init.out ?? []) as ReadonlyArray<CallRecord>;

const noopLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  throw: (msg: string) => {
    throw new Error(msg);
  },
} as unknown as Destination.Context['logger'];

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
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('init', async () => {
    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spySnowplow(env);

    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'snowplow',
      config: initConfig,
      env: spiedEnv,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(collected()).toEqual(initOut);
  });

  it.each(stepEntries)('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
      command?: 'consent' | 'user' | 'config' | 'run';
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spySnowplow(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    if (example.command === 'consent') {
      await elb('walker destination', { ...dest, env: spiedEnv }, initConfig);
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
        { ...initConfig, mapping: mappingConfig },
      );
      await elb(event);
    }

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().slice(initOut.length);

    expect(actual).toEqual(expected);
  });
});
