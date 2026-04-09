import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env } from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  // Single call: out[0] is a string method path
  if (typeof out[0] === 'string') return [out as CallRecord];
  // Multi-call: array of [path, ...args] tuples
  return out as CallRecord[];
}

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
    identify: makeSpy('identify') as Env['clarity']['identify'],
    setTag: makeSpy('setTag') as Env['clarity']['setTag'],
    event: makeSpy('event'),
    consent: makeSpy('consent'),
    consentV2: makeSpy('consentV2') as Env['clarity']['consentV2'],
    upgrade: makeSpy('upgrade'),
  };
  return { env, collected: () => calls };
}

// Canonical consent translation table used for command:'consent' examples.
const TEST_CONSENT_MAP = {
  analytics: 'analytics_Storage' as const,
  marketing: 'ad_Storage' as const,
};

describe('clarity destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      command?: 'consent' | 'user' | 'config' | 'run';
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    if (example.command === 'consent') {
      // Command examples: route `in` through elb('walker <command>', in)
      // rather than pushing it as an event. Register a minimal destination
      // with the canonical consent translation table.
      elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          settings: {
            apiKey: 'test-project',
            consent: TEST_CONSENT_MAP,
          },
        },
      );
      await elb('walker consent', example.in as WalkerOS.Consent);
    } else {
      // Standard event example.
      const event = example.in as WalkerOS.Event;
      const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
      const mappingConfig = mapping
        ? { [event.entity]: { [event.action]: mapping } }
        : undefined;

      elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          settings: { apiKey: 'test-project' },
          mapping: mappingConfig,
        },
      );
      await elb(event);
    }

    // Drop the init call — every example triggers init once, it is not part
    // of the declared `out`.
    const expected = flatten(example.out as ExpectedOut);
    const actual = collected().filter(([path]) => path !== 'clarity.init');

    expect(actual).toEqual(expected);
  });
});
