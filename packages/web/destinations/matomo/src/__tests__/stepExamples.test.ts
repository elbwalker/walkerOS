import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, createLogger, isObject } from '@walkeros/core';
import type { Config, Rule } from '../types';
import { examples } from '../dev';
import destinationMatomo from '..';
import { expectSimulationResolves } from '@walkeros/core/dev';

type CallRecord = [string, ...unknown[]];

/**
 * `StepExample.in` and `.mapping` are typed `unknown`. Narrow them with type
 * predicates instead of `as` assertions.
 */
function isEvent(value: unknown): value is WalkerOS.Event {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.entity === 'string' &&
    typeof value.action === 'string'
  );
}

function isConfig(value: unknown): value is Config {
  return isObject(value);
}

function isRule(value: unknown): value is Rule {
  return isObject(value);
}

const initExample = examples.step.init;
const initConfig: Config = isConfig(initExample.in) ? initExample.in : {};
const initOut: CallRecord[] = [...(initExample.out ?? [])].map((effect) => [
  ...effect,
]);

function makeMockPaq(): {
  mockPaq: unknown[];
  calls: CallRecord[];
} {
  const calls: CallRecord[] = [];
  const mockPaq: unknown[] = [];
  mockPaq.push = jest.fn((...args: unknown[]) => {
    for (const arg of args) calls.push(['_paq.push', arg]);
    return calls.length;
  });
  return { mockPaq, calls };
}

describe('matomo web destination -- step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('init', async () => {
    const { init } = destinationMatomo;
    if (!init) throw new Error('init missing');

    const { mockPaq, calls } = makeMockPaq();
    const env = clone(examples.env.push);
    env.window._paq = mockPaq;
    const { collector } = await startFlow();

    await init({
      id: 'matomo',
      config: initConfig,
      env,
      logger: createLogger(),
      collector,
    });

    expect(calls).toEqual(initOut);
  });

  it.each(stepEntries)('%s', async (name, example) => {
    if (!isEvent(example.in))
      throw new Error(`step example "${name}" has no event input`);
    const event = example.in;

    const rule = isRule(example.mapping) ? example.mapping : undefined;
    const mapping: Config['mapping'] = rule
      ? { [event.entity]: { [event.action]: rule } }
      : undefined;

    const { mockPaq, calls } = makeMockPaq();
    const env = clone(examples.env.push);
    env.window._paq = mockPaq;

    const { elb } = await startFlow();
    await elb('walker destination', {
      code: { ...destinationMatomo, env },
      config: {
        ...initConfig,
        settings: { ...initConfig.settings, ...example.settings },
        mapping,
      },
    });

    await elb(event);

    // Slice off the init calls, which run on the first event
    const actual = calls.slice(initOut.length);
    expect(actual).toEqual([...(example.out ?? [])]);
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
