// The @hotjar/browser package is ESM -- stub the import so Jest can load it.
jest.mock('@hotjar/browser', () => ({
  __esModule: true,
  default: {},
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Install spies onto an Env's hotjar methods. Calls are collected into
 * a shared array and prefixed with the dotted method path.
 */
function spyEnv(env: Env): {
  env: Env;
  collected: () => CallRecord[];
} {
  const calls: CallRecord[] = [];
  const makeSpy =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([`hotjar.${name}`, ...args]);
      return true;
    };
  env.hotjar = {
    init: makeSpy('init') as NonNullable<Env['hotjar']>['init'],
    event: makeSpy('event'),
    identify: makeSpy('identify') as NonNullable<Env['hotjar']>['identify'],
    stateChange: makeSpy('stateChange'),
    isReady: () => true,
  };
  return { env, collected: () => calls };
}

describe('hotjar destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { siteId: number } = {
      siteId: 1234567,
      ...(example.settings || {}),
    };

    // Standard event example (no command examples -- Hotjar has no consent handler).
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env: spiedEnv },
      {
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );
    await elb(event);

    // Drop the init call -- every example triggers init once, it is not part
    // of the declared `out`.
    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().filter(([path]) => path !== 'hotjar.init');

    expect(actual).toEqual(expected);
  });
});
