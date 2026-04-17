import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, HeapSDK, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Install spies onto an Env's window.heap methods. Calls are collected
 * into a shared array as ['methodName', ...args].
 */
function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([`heap.${name}`, ...args]);
    };

  const heap: HeapSDK = {
    load: record('load') as HeapSDK['load'],
    track: record('track') as HeapSDK['track'],
    identify: record('identify') as HeapSDK['identify'],
    resetIdentity: record('resetIdentity'),
    addUserProperties: record(
      'addUserProperties',
    ) as HeapSDK['addUserProperties'],
    addEventProperties: record(
      'addEventProperties',
    ) as HeapSDK['addEventProperties'],
    clearEventProperties: record('clearEventProperties'),
    startTracking: record('startTracking'),
    stopTracking: record('stopTracking'),
    appid: 'test-app-id',
  };

  env.window = { heap };
  return { env, collected: () => calls };
}

describe('heap destination — step examples', () => {
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

    const baseSettings: Partial<Settings> & { appId: string } = {
      appId: 'test-app-id',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      // Consent examples: declare the consent key on the destination so
      // on() knows what to check, then fire walker consent.
      await elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          consent: { analytics: true },
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

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    // Filter init-time load() call.
    const actual = collected().filter(([path]) => path !== 'heap.load');
    expect(actual).toEqual(expected);
  });
});
