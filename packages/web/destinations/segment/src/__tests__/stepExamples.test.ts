// @segment/analytics-next is dual CJS/ESM; Jest's CJS transformer can
// struggle with its ESM entry. Tests wire their own mock via env.analytics,
// so we stub the real module with an empty namespace to satisfy Jest's
// loader regardless of which entry it resolves.
jest.mock('@segment/analytics-next', () => ({
  __esModule: true,
  AnalyticsBrowser: class {
    static load() {
      return {
        track: () => {},
        identify: () => {},
        group: () => {},
        page: () => {},
        alias: () => {},
        reset: () => {},
        setAnonymousId: () => {},
      };
    }
  },
}));

import type {
  Destination,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Env, SegmentAnalytics, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

const initConfig = examples.step.init.in as Destination.Config;
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
 * Builds a recording Env where analytics.load() returns an instance
 * whose every method appends to a shared call log. Also records the
 * load() call itself as ['analytics.load', settings, options].
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const instance: SegmentAnalytics = {
    track: (...args: unknown[]) => {
      calls.push(['analytics.track', ...args]);
    },
    identify: (...args: unknown[]) => {
      calls.push(['analytics.identify', ...args]);
    },
    group: (...args: unknown[]) => {
      calls.push(['analytics.group', ...args]);
    },
    page: (...args: unknown[]) => {
      calls.push(['analytics.page', ...args]);
    },
    alias: (...args: unknown[]) => {
      calls.push(['analytics.alias', ...args]);
    },
    reset: () => {
      calls.push(['analytics.reset']);
    },
    setAnonymousId: (id: string) => {
      calls.push(['analytics.setAnonymousId', id]);
    },
  } as unknown as SegmentAnalytics;

  const env: Env = {
    analytics: {
      load: (settings, options) => {
        if (options !== undefined) {
          calls.push(['analytics.load', settings, options]);
        } else {
          calls.push(['analytics.load', settings]);
        }
        return instance;
      },
    },
  };

  return { env, collected: () => calls };
}

/**
 * Normalize a call record so trailing undefined args are trimmed.
 * Matches how the example's `out` is authored.
 */
function trimUndefined(call: CallRecord): CallRecord {
  const trimmed = [...call];
  while (trimmed.length > 1 && trimmed[trimmed.length - 1] === undefined) {
    trimmed.pop();
  }
  return trimmed as CallRecord;
}

describe('segment destination — step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('init', async () => {
    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'segment',
      config: initConfig,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(collected().map(trimUndefined)).toEqual(
      initOut.map((c) => trimUndefined(c as CallRecord)),
    );
  });

  it.each(stepEntries)('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
      configInclude?: string[];
    };

    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseInitSettings = (initConfig.settings || {}) as Partial<Settings>;
    const baseSettings: Partial<Settings> & { apiKey: string } = {
      ...baseInitSettings,
      apiKey:
        (baseInitSettings as { apiKey?: string }).apiKey ?? 'test-project',
      ...(example.settings || {}),
    };

    const isConsent = example.command === 'consent';

    if (isConsent) {
      // Consent examples need config.consent declared so the destination's
      // on('consent') handler defers load() until the first grant. Because
      // load() is deferred, no init-time effect is captured — the load()
      // fired by consent IS the feature under test.
      await elb(
        'walker destination',
        { ...dest, env },
        {
          consent: { analytics: true },
          include: example.configInclude,
          settings: baseSettings,
        },
      );
      await elb('walker consent', example.in as WalkerOS.Consent);

      const expected = (example.out ?? []).map((call) =>
        trimUndefined(call as CallRecord),
      );
      const actual = collected().map(trimUndefined);
      expect(actual).toEqual(expected);
      return;
    }

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env },
      {
        include: example.configInclude,
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );
    await elb(event);

    const expected = (example.out ?? []).map((call) =>
      trimUndefined(call as CallRecord),
    );
    const actual = collected().slice(initOut.length).map(trimUndefined);
    expect(actual).toEqual(expected);
  });
});
