import type {
  Destination,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import { createLogger, isObject } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Config, Env } from '../types';
import { expectSimulationResolves } from '@walkeros/core/dev';

type CallRecord = [string, ...unknown[]];

const initConfig = examples.step.init.in as Config;
const initOut = (examples.step.init.out ?? []) as ReadonlyArray<CallRecord>;

const noopLogger = createLogger();

/**
 * Spy: captures push-side `plausible(...)` calls into an ordered array, under
 * their simulation path (window.plausible).
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const spy = (
    event: string,
    options?: { props?: Record<string, unknown> },
  ) => {
    const args: unknown[] = [event];
    if (options !== undefined) args.push(options);
    calls.push(['window.plausible', ...args]);
  };
  const env: Env = {
    window: {
      // Pre-install spy so init's `window.plausible = window.plausible || ...`
      // keeps our function instead of replacing with the queue stub.
      plausible: Object.assign(spy, {
        q: [] as IArguments[],
      }),
    },
  };
  return { env, collected: () => calls };
}

describe('plausible destination -- step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('init', async () => {
    const { env, collected } = spyEnv();
    // Init test: start with plausible unset so addScript's appendChild
    // fires and the init queue-stub assignment is exercised. The push
    // spy isn't needed here.
    env.window.plausible = undefined;

    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'plausible',
      config: initConfig,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    // loadVendor injects into the page's document
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        'script[data-walkeros-vendor]',
      ),
    ).map((script) => [
      'script.appendChild',
      { src: script.src, domain: script.dataset.domain },
    ]);

    expect([...scripts, ...collected()]).toEqual(initOut);
  });

  // Plausible takes scalar custom props and revenue as { currency, amount }
  it('sends scalar props and a { currency, amount } revenue', () => {
    const invalid = Object.entries(examples.step).flatMap(([name, example]) =>
      (example.out ?? []).flatMap(([callable, , options]) => {
        if (callable !== 'window.plausible' || !isObject(options)) return [];
        const { props, revenue } = options;
        const scalarProps =
          props === undefined ||
          (isObject(props) &&
            Object.values(props).every((value) =>
              ['string', 'number', 'boolean'].includes(typeof value),
            ));
        const revenueObject =
          revenue === undefined ||
          (isObject(revenue) &&
            typeof revenue.currency === 'string' &&
            typeof revenue.amount === 'number');
        return scalarProps && revenueObject ? [] : [name];
      }),
    );
    expect(invalid).toEqual([]);
  });

  it.each(stepEntries)('%s', async (name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
    };

    const { env: spiedEnv, collected } = spyEnv();

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb('walker destination', {
      code: { ...dest, env: spiedEnv },
      config: { ...initConfig, mapping: mappingConfig },
    });
    await elb(event);

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected();

    expect(actual).toEqual(expected);
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
