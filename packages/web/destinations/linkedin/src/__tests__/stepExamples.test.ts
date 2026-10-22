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
import { clone, isObject, isString } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Lintrk, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

function isConsent(value: unknown): value is WalkerOS.Consent {
  return (
    isObject(value) &&
    Object.values(value).every((granted) => typeof granted === 'boolean')
  );
}

function isEvent(value: unknown): value is WalkerOS.Event {
  return (
    isObject(value) &&
    isString(value.name) &&
    isString(value.entity) &&
    isString(value.action)
  );
}

function isRule(value: unknown): value is WalkerOSMapping.Rule {
  return isObject(value);
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
  const lintrk: Lintrk = Object.assign(
    (action: string, data: unknown) => {
      calls.push(['lintrk', action, data]);
    },
    { q: [] },
  );
  env.window.lintrk = lintrk;
  return { env, collected: () => calls };
}

describe('linkedin destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const env = clone(examples.env.push);
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: '123456',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      if (!isConsent(example.in))
        throw new Error(`step example "${name}" has no consent input`);
      await elb('walker destination', {
        code: { ...dest, env: spiedEnv },
        config: { settings: baseSettings, consent: { marketing: true } },
      });
      await elb('walker consent', example.in);
    } else {
      if (!isEvent(example.in))
        throw new Error(`step example "${name}" has no event input`);
      const event = example.in;
      const mapping = isRule(example.mapping) ? example.mapping : undefined;
      const mappingConfig = mapping
        ? { [event.entity]: { [event.action]: mapping } }
        : undefined;

      await elb('walker destination', {
        code: { ...dest, env: spiedEnv },
        config: {
          settings: baseSettings,
          mapping: mappingConfig,
        },
      });
      await elb(event);
    }

    expect(collected()).toEqual([...(example.out ?? [])]);
  });
});
