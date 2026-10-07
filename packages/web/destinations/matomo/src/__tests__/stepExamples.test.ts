import type { WalkerOS } from '@walkeros/core';
import { runInNewContext } from 'vm';
import { startFlow } from '@walkeros/collector';
import { clone, createLogger, isArray, isObject } from '@walkeros/core';
import type { Config, Rule } from '../types';
import type { StepExample } from '../examples/step';
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

// Functions in examples are published as `{ $code: fn.toString() }` in
// walkerOS.json and evaluated without the module scope they were written in.
function asPublished(rule: Rule | undefined): Rule | undefined {
  if (rule === undefined) return rule;
  return JSON.parse(
    JSON.stringify(rule, (_, value) =>
      typeof value === 'function' ? { $code: value.toString() } : value,
    ),
    (_, value) =>
      isObject(value) && typeof value.$code === 'string'
        ? runInNewContext(`(${value.$code})`)
        : value,
  );
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

  // Matomo records a cart or an order only after an addEcommerceItem call per
  // product, and a rule sends one command, so no ecommerce example is public.
  it('publishes no ecommerce command', () => {
    const commands = Object.values(examples.step)
      .filter((example) => example.public !== false)
      .flatMap((example) => [...(example.out ?? [])])
      .map(([, command]) => (isArray(command) ? command[0] : undefined));
    expect(commands.filter((name) => /ecommerce/i.test(String(name)))).toEqual(
      [],
    );
  });

  // package_get still lists hidden examples with their descriptions, so a
  // hidden ecommerce example says it is a test fixture, not a Matomo call.
  it('hidden ecommerce examples say they are test fixtures', () => {
    const misleading = Object.entries(examples.step)
      .filter(
        ([, example]) =>
          example.public === false &&
          [...(example.out ?? [])].some(
            ([, command]) =>
              isArray(command) && /ecommerce/i.test(String(command[0])),
          ),
      )
      .filter(([, example]) => !example.description?.startsWith('Test fixture'))
      .map(([name]) => name);
    expect(misleading).toEqual([]);
  });

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

  async function run(
    name: string,
    example: StepExample,
    rule: Rule | undefined,
  ): Promise<CallRecord[]> {
    if (!isEvent(example.in))
      throw new Error(`step example "${name}" has no event input`);
    const event = example.in;

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
    return calls.slice(initOut.length);
  }

  it.each(stepEntries)('%s', async (name, example) => {
    const rule = isRule(example.mapping) ? example.mapping : undefined;
    expect(await run(name, example, rule)).toEqual([...(example.out ?? [])]);
  });

  it.each(stepEntries)('%s as published', async (name, example) => {
    const rule = isRule(example.mapping) ? example.mapping : undefined;
    expect(await run(name, example, asPublished(rule))).toEqual([
      ...(example.out ?? []),
    ]);
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
