import type {
  Destination,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Config, Env } from '../types';

type CallRecord = [string, ...unknown[]];

const initConfig = examples.step.init.in as Config;
const initOut = (examples.step.init.out ?? []) as ReadonlyArray<CallRecord>;

const noopLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  throw: (msg: string) => {
    throw new Error(msg);
  },
} as unknown as Destination.Context['logger'];

/**
 * Unified spy: captures both init-side `script.appendChild` calls and
 * push-side `plausible(...)` calls into a single ordered array. This
 * lets event tests bootstrap with the real init (triggering
 * loadScript) and slice off `initOut.length` to isolate push calls.
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const spy = (
    event: string,
    options?: { props?: Record<string, unknown> },
  ) => {
    const args: unknown[] = [event];
    if (options !== undefined) args.push(options);
    calls.push(['plausible', ...args]);
  };
  const env = {
    window: {
      // Pre-install spy so init's `w.plausible = w.plausible || ...`
      // keeps our function instead of replacing with the queue stub.
      plausible: Object.assign(spy, {
        q: [] as IArguments[],
      }) as unknown as Env['window']['plausible'],
    },
    document: {
      createElement: (_tag: string) => {
        const el = { src: '', dataset: {} as { domain?: string } };
        return el as unknown as HTMLScriptElement;
      },
      head: {
        appendChild: (el: unknown) => {
          const script = el as { src: string; dataset: { domain?: string } };
          calls.push([
            'script.appendChild',
            {
              src: script.src,
              domain: script.dataset.domain,
            },
          ]);
          return el;
        },
      },
      querySelector: () => null,
    },
  } as unknown as Env;
  return { env, collected: () => calls };
}

describe('plausible destination — step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('init', async () => {
    const { env, collected } = spyEnv();
    // Init test: start with plausible unset so addScript's appendChild
    // fires and the init queue-stub assignment is exercised. The push
    // spy isn't needed here.
    (env.window as { plausible?: unknown }).plausible = undefined;

    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'plausible',
      config: initConfig,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(collected()).toEqual(initOut);
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

    await elb(
      'walker destination',
      { ...dest, env: spiedEnv },
      { ...initConfig, mapping: mappingConfig },
    );
    await elb(event);

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().slice(initOut.length);

    expect(actual).toEqual(expected);
  });
});
