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
import type { FullStoryStepExample } from '../examples/step';
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
  it.each<[string, FullStoryStepExample]>(Object.entries(examples.step))(
    '%s',
    async (name, example) => {
      const env = clone(examples.env.push) as Env;
      const { env: spiedEnv, collected } = spyEnv(env);

      const dest = jest.requireActual('../').default;
      const { elb } = await startFlow();

      const baseSettings: Partial<Settings> & { orgId: string } = {
        orgId: 'o-TEST-na1',
        ...(example.settings || {}),
      };

      if (example.command === 'consent') {
        // Declare the example's consent key(s) on the destination so the
        // collector gates its load: under consent gating a destination is
        // never initialized while its required consent is denied, and
        // on('consent') knows what to check.
        const requiredConsent: WalkerOS.Consent = {};
        for (const key of Object.keys({
          ...(example.before ?? {}),
          ...((example.in as WalkerOS.Consent) ?? {}),
        })) {
          requiredConsent[key] = true;
        }
        await elb('walker destination', {
          code: { ...dest, env: spiedEnv },
          config: {
            consent: requiredConsent,
            settings: baseSettings,
          },
        });
        // Grant first when the example declares it, so the gated destination is
        // loaded before the consent under test (it never loads under denial).
        // Both the grant and the consent-under-test effects are asserted.
        if (example.before) await elb('walker consent', example.before);
        await elb('walker consent', example.in as WalkerOS.Consent);
      } else {
        const event = example.in as WalkerOS.Event;
        const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
        const mappingConfig = mapping
          ? { [event.entity]: { [event.action]: mapping } }
          : undefined;

        elb('walker destination', {
          code: { ...dest, env: spiedEnv },
          config: {
            settings: baseSettings,
            mapping: mappingConfig,
          },
        });
        await elb(event);
      }

      // Drop the init-time call -- every example triggers init once.
      const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
      const actual = collected().filter(([path]) => path !== 'fullstory.init');

      expect(actual).toEqual(expected);
    },
  );
});
