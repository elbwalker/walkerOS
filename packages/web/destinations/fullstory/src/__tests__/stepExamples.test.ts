// The @fullstory/browser package is ESM -- stub the import so Jest can load it.
jest.mock('@fullstory/browser', () => ({
  __esModule: true,
  init: jest.fn(),
  FullStory: jest.fn(),
  isInitialized: jest.fn(() => false),
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Install recording spies onto an Env's fullstory methods. Calls are
 * collected into a shared array and prefixed with the dotted method path
 * so the assertion can compare directly against the example `out` shape.
 */
function spyEnv(env: Env): {
  env: Env;
  collected: () => CallRecord[];
} {
  const calls: CallRecord[] = [];
  const makeSpy =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([`fullstory.${name}`, ...args]);
    };
  env.fullstory = {
    init: makeSpy('init') as NonNullable<Env['fullstory']>['init'],
    trackEvent: makeSpy('trackEvent') as NonNullable<
      Env['fullstory']
    >['trackEvent'],
    setIdentity: makeSpy('setIdentity') as NonNullable<
      Env['fullstory']
    >['setIdentity'],
    setProperties: makeSpy('setProperties') as NonNullable<
      Env['fullstory']
    >['setProperties'],
    shutdown: makeSpy('shutdown'),
    start: makeSpy('start'),
  };
  return { env, collected: () => calls };
}

describe('fullstory destination -- step examples', () => {
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
    const { elb } = await startFlow();

    const baseSettings: Partial<Settings> & { orgId: string } = {
      orgId: 'o-TEST-na1',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          settings: baseSettings,
        },
      );
      // Trigger init by pushing a priming event before consent so the
      // destination's env is wired and on('consent') sees the spy env.
      await elb({
        entity: 'ping',
        action: 'init',
      } as unknown as WalkerOS.PartialEvent);
      await elb('walker consent', example.in as WalkerOS.Consent);
    } else {
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
    }

    // Drop init + priming trackEvent calls -- every example triggers init
    // once, and consent examples push a priming event that fires trackEvent.
    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().filter(([path, arg]) => {
      if (path === 'fullstory.init') return false;
      if (
        example.command === 'consent' &&
        path === 'fullstory.trackEvent' &&
        isPrimingEvent(arg)
      ) {
        return false;
      }
      return true;
    });

    expect(actual).toEqual(expected);
  });
});

function isPrimingEvent(arg: unknown): boolean {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    (arg as { name?: unknown }).name === 'ping init'
  );
}
