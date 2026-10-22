import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { ClarityStepExample } from '../examples/step';
import type { Env, Settings } from '../types';
import { expectSimulationResolves } from '@walkeros/core/dev';

type CallRecord = [string, ...unknown[]];

/**
 * Install jest spies onto an Env's clarity methods. Calls are collected into
 * a shared array and prefixed with the dotted method path so the assertion
 * can compare directly against the example `out` shape.
 */
function spyEnv(env: Env): {
  env: Env;
  collected: () => CallRecord[];
} {
  const calls: CallRecord[] = [];
  const makeSpy =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([`clarity.${name}`, ...args]);
    };
  env.clarity = {
    init: makeSpy('init'),
    identify: makeSpy('identify') as NonNullable<Env['clarity']>['identify'],
    setTag: makeSpy('setTag') as NonNullable<Env['clarity']>['setTag'],
    event: makeSpy('event'),
    consentV2: makeSpy('consentV2') as NonNullable<Env['clarity']>['consentV2'],
    upgrade: makeSpy('upgrade'),
  };
  return { env, collected: () => calls };
}

describe('clarity destination -- step examples', () => {
  // StepExample renders the description, in, mapping and out, not the
  // settings an example merges in, so a public example names them.
  it('public examples name the settings they run with', () => {
    const unnamed = Object.entries(examples.step).flatMap(([name, example]) =>
      example.public === false
        ? []
        : Object.keys(example.settings ?? {})
            .filter((key) => !example.description?.includes(`settings.${key}`))
            .map((key) => `${name}: settings.${key}`),
    );
    expect(unnamed).toEqual([]);
  });

  // Non-public examples (silent, failures) run in the conformance test.
  const published = Object.entries(examples.step).filter(
    ([, example]) => example.public !== false,
  );

  it.each<[string, ClarityStepExample]>(published)(
    '%s',
    async (name, example) => {
      const env = clone(examples.env.push) as Env;
      const { env: spiedEnv, collected } = spyEnv(env);

      const dest = jest.requireActual('../').default;
      const { elb } = await startFlow();

      // Effects before this index belong to the example's `before` grant.
      let before = 0;
      const baseSettings: Partial<Settings> & { apiKey: string } = {
        apiKey: 'test-project',
        ...(example.settings || {}),
      };

      if (example.command === 'consent') {
        // Command examples: route `in` through elb('walker <command>', in)
        // rather than pushing it as an event. Declare the required consent on
        // the destination so the collector gates init until consent is granted.
        await elb('walker destination', {
          code: { ...dest, env: spiedEnv },
          config: {
            consent: { analytics: true, marketing: true },
            include: example.configInclude,
            settings: baseSettings,
          },
        });
        // Load the gated destination under a prior grant first when the example
        // declares one, so a revoke acts on an already-granted destination. Both
        // the grant and the consent-under-test effects are asserted.
        if (example.before) await elb('walker consent', example.before);
        before = collected().length;
        await elb('walker consent', example.in as WalkerOS.Consent);
      } else {
        // Standard event example.
        const event = example.in as WalkerOS.Event;
        const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
        const mappingConfig = mapping
          ? { [event.entity]: { [event.action]: mapping } }
          : undefined;

        elb('walker destination', {
          code: { ...dest, env: spiedEnv },
          config: {
            include: example.configInclude,
            settings: baseSettings,
            mapping: mappingConfig,
          },
        });
        await elb(event);
      }

      // Drop the init call: every example triggers init once, it is not part
      // of the declared `out`.
      const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
      const actual = collected()
        .slice(before)
        .filter(([path]) => path !== 'clarity.init');

      expect(actual).toEqual(expected);
    },
  );
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
