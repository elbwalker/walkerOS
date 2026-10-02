import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, createLogger, isObject } from '@walkeros/core';
import type { Config, Rule } from '../types';
import { examples } from '../dev';
import destinationPiwikPro from '..';
import { expectSimulationResolves } from '@walkeros/core/dev';

type CallRecord = [string, ...unknown[]];

/**
 * `StepExample.in` and `.mapping` are typed `unknown`. Narrow them with type
 * predicates (the cast-free way) rather than `as` assertions.
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

/**
 * Examples that run with the default settings. Every other event example runs
 * with `linkTracking: false`, so its `out` holds only its own commands.
 */
const DEFAULT_SETTINGS_EXAMPLES = ['linkTrackingAfterFirstHit'];

const noopLogger = createLogger();

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

describe('piwikpro web destination -- step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('pass no currency argument, the tracker has none (W6)', () => {
    const taught = Object.values(examples.step).map((example) => [
      example.description,
      example.mapping,
      example.out,
    ]);
    expect(JSON.stringify(taught)).not.toMatch(/currency/i);
  });

  it('init', async () => {
    const { init } = destinationPiwikPro;
    if (!init) throw new Error('init missing');

    const { mockPaq, calls } = makeMockPaq();
    const env = clone(examples.env.push);
    env.window._paq = mockPaq;
    const { collector } = await startFlow();

    await init({
      id: 'piwikpro',
      config: initConfig,
      env,
      logger: noopLogger,
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
    const settings = DEFAULT_SETTINGS_EXAMPLES.includes(name)
      ? initConfig.settings
      : { ...initConfig.settings, linkTracking: false };

    const { mockPaq, calls } = makeMockPaq();
    const env = clone(examples.env.push);
    env.window._paq = mockPaq;

    const { elb } = await startFlow();
    await elb('walker destination', {
      code: { ...destinationPiwikPro, env },
      config: { ...initConfig, settings, mapping },
    });

    await elb(event);

    // Event test: wrap expected as _paq.push records and slice off init calls
    const expectedRecords = [...(example.out ?? [])].map<CallRecord>((args) => [
      '_paq.push',
      args,
    ]);
    const actual = calls.slice(initOut.length);
    expect(actual).toEqual(expectedRecords);
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
