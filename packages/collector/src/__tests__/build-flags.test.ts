/**
 * Lean-path behaviour of the build-time feature flags. A CDN bundle defines a
 * flag false and the bundler folds the feature out; here the same guards are
 * driven at runtime by setting the global, which is what an undefined flag
 * reads. Flags absent (the default) are covered by every other suite.
 */
import { Level, createIngest } from '@walkeros/core';
import type {
  BuildFlag,
  Collector,
  Destination,
  FlowState,
  Logger,
  ObserverFn,
  Source,
  Store,
  WalkerOS,
} from '@walkeros/core';
import { startFlow } from '..';

const FLAGS: BuildFlag[] = [
  '__WALKEROS_OBSERVE__',
  '__WALKEROS_STORES__',
  '__WALKEROS_STATE__',
  '__WALKEROS_VALIDATE__',
];

function setFlag(flag: BuildFlag, value: boolean | undefined): void {
  globalThis[flag] = value;
}

/** Capture WARN-level messages via an injected logger handler. */
function warnCapture(): { warns: string[]; logger: Logger.Config } {
  const warns: string[] = [];
  const handler: Logger.Handler = (level, message) => {
    if (level === Level.WARN) warns.push(message);
  };
  return { warns, logger: { level: 'WARN', handler } };
}

interface ApiEnv extends Destination.BaseEnv {
  api: { track: (name: string) => void };
}
type ApiTypes = Destination.Types<unknown, unknown, ApiEnv>;

/** A destination that records the events it receives. */
function spy(events: WalkerOS.Event[], type = 'spy'): Destination.Instance {
  return {
    type,
    config: {},
    push: async (event: WalkerOS.Event) => {
      events.push(event);
    },
  };
}

afterEach(() => {
  for (const flag of FLAGS) setFlag(flag, undefined);
});

describe('__WALKEROS_OBSERVE__ false', () => {
  it('installs no telemetry for config.observe, warns, and keeps caller observers', async () => {
    setFlag('__WALKEROS_OBSERVE__', false);
    const { warns, logger } = warnCapture();
    const observer: ObserverFn = () => undefined;

    const { collector } = await startFlow({
      logger,
      observers: [observer],
      observe: {
        url: 'https://obs.example',
        sessionId: 'ses_1',
        token: 'tok',
        level: 'trace',
      },
    });

    expect([...collector.observers]).toEqual([observer]);
    expect(collector.observeLevel).toBeUndefined();
    expect(warns).toContain('observe: not in this build, config ignored');
  });

  it('skips trace-level call capture and hands the destination its env untouched', async () => {
    setFlag('__WALKEROS_OBSERVE__', false);
    const states: FlowState[] = [];
    const tracked: string[] = [];
    const track = (name: string): void => {
      tracked.push(name);
    };
    let received: unknown;
    const code: Destination.Instance<ApiTypes> = {
      type: 'api',
      config: {},
      env: { api: { track } },
      calls: ['call:api.track'],
      push: async (event, context) => {
        received = context.env.api.track;
        context.env.api.track(event.name);
      },
    };

    const { collector } = await startFlow({ destinations: { api: { code } } });
    collector.observeLevel = () => 'trace';
    collector.observers.add((state) => states.push(state));

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const out = states.find(
      (s) => s.stepId === 'destination.api' && s.phase === 'out',
    );
    expect(out).toBeDefined();
    expect(out?.calls).toBeUndefined();
    expect(received).toBe(track);
    expect(tracked).toEqual(['page view']);
  });
});

describe('__WALKEROS_STORES__ false', () => {
  it('skips declared stores with a warning and keeps the default __cache', async () => {
    setFlag('__WALKEROS_STORES__', false);
    const { warns, logger } = warnCapture();
    const storeCode: Store.Init = () => {
      throw new Error('a declared store must not initialize');
    };

    const { collector, elb } = await startFlow({
      logger,
      stores: { kv: { code: storeCode } },
    });

    expect(Object.keys(collector.stores)).toEqual(['__cache']);
    expect(warns).toContain('stores: not in this build, config ignored');

    await elb('walker shutdown');
    expect(collector.hasShutdown).toBe(true);
  });

  it('serves a destination cache from the default __cache', async () => {
    setFlag('__WALKEROS_STORES__', false);
    const events: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      destinations: {
        spy: {
          code: spy(events),
          cache: { rules: [{ key: ['event.name'], ttl: 60 }] },
        },
      },
    });

    await elb({ name: 'page view', data: {} });
    await elb({ name: 'page view', data: {} });

    expect(events).toHaveLength(1);
  });

  it('serves declarative state from the default __cache', async () => {
    setFlag('__WALKEROS_STORES__', false);
    const read: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      destinations: {
        seeder: {
          code: spy([], 'seeder'),
          state: {
            mode: 'set',
            key: 'event.user.id',
            value: 'event.data.token',
          },
        },
        reader: {
          code: spy(read, 'reader'),
          state: {
            mode: 'get',
            key: 'event.user.id',
            value: 'event.data.fetched',
          },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'u1' }, data: { token: 'D1' } });
    await elb({ name: 'page view', user: { id: 'u1' }, data: {} });

    expect(read.map((event) => event.data?.fetched)).toContain('D1');
  });
});

describe('__WALKEROS_STATE__ false', () => {
  it('ignores step state and warns once per step that carries it', async () => {
    setFlag('__WALKEROS_STATE__', false);
    const { warns, logger } = warnCapture();
    const read: WalkerOS.Event[] = [];
    const sourceCode: Source.Init<
      Source.Types<unknown, unknown, Collector.PushFn>
    > = async (context) => ({
      type: 'seeder',
      config: context.config,
      push: context.env.push,
    });

    const { collector, elb } = await startFlow({
      logger,
      sources: {
        seeder: {
          code: sourceCode,
          config: {
            state: { mode: 'set', key: 'event.user.id', value: 'event.data.a' },
          },
        },
      },
      transformers: {
        stasher: {
          state: { mode: 'set', key: 'event.user.id', value: 'event.data.b' },
        },
      },
      destinations: {
        reader: {
          before: ['stasher'],
          code: spy(read, 'reader'),
          state: {
            mode: 'get',
            key: 'event.user.id',
            value: 'event.data.fetched',
          },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'u1' }, data: { a: 1, b: 2 } });
    await collector.push({ name: 'page view', user: { id: 'u1' }, data: {} });

    expect(read).toHaveLength(2);
    expect(read.every((event) => event.data?.fetched === undefined)).toBe(true);
    expect(warns).toEqual(
      expect.arrayContaining([
        'state: not in this build, source.seeder state ignored',
        'state: not in this build, transformer.stasher state ignored',
        'state: not in this build, destination.reader state ignored',
      ]),
    );
  });

  it('warns for a runtime destination that carries state', async () => {
    setFlag('__WALKEROS_STATE__', false);
    const { warns, logger } = warnCapture();

    const { elb } = await startFlow({ logger });
    await elb('walker destination', {
      code: spy([], 'late'),
      config: { id: 'late' },
      state: { mode: 'set', key: 'event.user.id', value: 'event.data.x' },
    });

    expect(warns).toContain(
      'state: not in this build, destination.late state ignored',
    );
  });
});

describe('__WALKEROS_VALIDATE__ false', () => {
  const invalid = {
    code: async () => ({ type: 'pass', config: {}, push: () => undefined }),
    unknownKey: true,
  };

  it('registers a transformer entry without runtime validation', async () => {
    setFlag('__WALKEROS_VALIDATE__', false);
    const { warns, logger } = warnCapture();

    const { collector } = await startFlow({
      logger,
      transformers: { bad: invalid },
    });

    expect(collector.transformers.bad).toBeDefined();
    expect(warns).toEqual([]);
  });

  it('flag absent: the same entry is validated and skipped', async () => {
    const { warns, logger } = warnCapture();

    const { collector } = await startFlow({
      logger,
      transformers: { bad: invalid },
    });

    expect(collector.transformers.bad).toBeUndefined();
    expect(warns[0]).toMatch(/^Transformer bad invalid \(UNKNOWN_KEY\)/);
  });
});
