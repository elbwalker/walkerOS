/**
 * Pinterest destination — step examples runner.
 *
 * Every fixture in `examples.step` is a test case. The runner installs a
 * spy as `env.window.pintrk`, pushes the example event through a real
 * walkerOS collector, then asserts the recorded pintrk calls (filtering
 * out init-time load/page commands) match the example's `out` array.
 */

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { Logger } from '@walkeros/core';
import { clone, createEvent, isObject, isString, Level } from '@walkeros/core';
import { destinationPinterest } from '..';
import { examples } from '../dev';
import type { Env, Pintrk } from '../types';

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
 * Install a spy on env.window.pintrk that records every call as a
 * CallRecord tuple (["window.pintrk", ...args]).
 */
function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const spy: Pintrk = Object.assign(
    (...args: unknown[]) => {
      calls.push(['pintrk', ...args]);
    },
    { queue: [], version: '3.0' },
  );
  env.window.pintrk = spy;
  return { env, collected: () => calls };
}

describe('pinterest destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const env = clone(examples.env.push);
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    if (example.command === 'consent') {
      if (!isConsent(example.in))
        throw new Error(`step example "${name}" has no consent input`);
      await elb('walker destination', {
        code: { ...dest, env: spiedEnv },
        config: {
          consent: { marketing: true },
          settings: { apiKey: '2612345678901' },
        },
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
          settings: { apiKey: '2612345678901' },
          mapping: mappingConfig,
        },
      });
      await elb(event);
    }

    // Drop init-time calls (load + page): covered by init.test.ts.
    const actual = collected().filter((call) => {
      const cmd = call[1];
      return cmd !== 'load' && cmd !== 'page';
    });

    expect(actual).toEqual([...(example.out ?? [])]);
  });

  it('writes one DEBUG line naming the event and the mapping key for a declared skip', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
    const { elb } = await startFlow({
      logger: { level: 'DEBUG', handler },
      destinations: {
        pinterest: {
          code: {
            ...destinationPinterest,
            env: spyEnv(clone(examples.env.push)).env,
          },
          config: {
            settings: { apiKey: '2612345678901' },
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: { identify: { map: { em: 'data.none' } } },
                },
              },
            },
          },
        },
      },
    });

    expect((await elb(createEvent({ name: 'company update' }))).ok).toBe(true);
    expect(lines.filter(([, message]) => message.includes('skipped'))).toEqual([
      [
        Level.DEBUG,
        'Pinterest skipped set: identify resolved to nothing',
        expect.objectContaining({ event: 'company update' }),
      ],
    ]);
  });
});
