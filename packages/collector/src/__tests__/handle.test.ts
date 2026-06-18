import type { Collector } from '@walkeros/core';
import type { Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';
import { collector } from '../collector';
import {
  commonHandleCommand,
  createEvent,
  enrichEvent,
  prepareEvent,
} from '../handle';

describe('Handle Commands', () => {
  let mockDestinationPush: jest.Mock;
  let mockDestinationInit: jest.Mock;
  let mockDestination: Destination.Instance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationPush = jest.fn();
    mockDestinationInit = jest.fn().mockResolvedValue({ settings: {} });

    mockDestination = {
      type: 'test',
      config: {},
      init: mockDestinationInit,
      push: mockDestinationPush,
    };
  });

  describe('walker destination command', () => {
    test('adds destination without config', async () => {
      const { elb, collector } = await startFlow({});

      // Initially no destinations
      expect(Object.keys(collector.destinations)).toHaveLength(0);

      // Add destination using new format: { code: destination }
      await elb('walker destination', { code: mockDestination });

      // Destination should be added with some default config
      expect(Object.keys(collector.destinations)).toHaveLength(1);
      const destinationId = Object.keys(collector.destinations)[0];
      expect(collector.destinations[destinationId]).toBeDefined();
      expect(collector.destinations[destinationId].config).toBeDefined();
    });

    test('adds destination with config including custom id', async () => {
      const { elb, collector } = await startFlow({});

      const customConfig: Destination.Config = {
        id: 'my-custom-id',
        init: true,
        loadScript: false,
        mapping: {
          entity: {
            action: {
              name: 'CustomEvent',
            },
          },
        },
      };

      // Add destination using new format: Init with config folded inside
      await elb('walker destination', {
        code: mockDestination,
        config: customConfig,
      });

      // Destination should be added with custom id and config
      expect(Object.keys(collector.destinations)).toEqual(['my-custom-id']);
      expect(collector.destinations['my-custom-id']).toBeDefined();
      expect(collector.destinations['my-custom-id'].config).toEqual(
        customConfig,
      );
    });

    test('adds destination with config and stores it properly', async () => {
      const { elb, collector } = await startFlow({});

      const customConfig: Destination.Config = {
        id: 'test-destination',
        settings: { apiKey: 'test-key' },
      };

      // Add destination using new format: Init with config folded inside
      await elb('walker destination', {
        code: mockDestination,
        config: customConfig,
      });

      // Destination should be added with custom config
      expect(collector.destinations['test-destination']).toBeDefined();
      expect(collector.destinations['test-destination'].config).toEqual(
        customConfig,
      );
    });

    test('handles destination config through commonHandleCommand', async () => {
      const { collector } = await startFlow({});

      const customConfig: Destination.Config = {
        id: 'cmd-test',
        settings: { foo: 'bar' },
      };

      // Call commonHandleCommand directly using new format: Init with config
      await commonHandleCommand(collector, 'destination', {
        code: mockDestination,
        config: customConfig,
      });

      // Destination should be added with config
      expect(collector.destinations['cmd-test']).toBeDefined();
      expect(collector.destinations['cmd-test'].config).toEqual(customConfig);
    });

    test('rejects the legacy { push } shorthand (no code field)', async () => {
      const { elb, collector } = await startFlow();
      await elb('walker destination', { push: jest.fn() } as never);
      expect(Object.values(collector.destinations)).toHaveLength(0);
    });

    test('rejects the legacy 2-positional form with config as 3rd arg', async () => {
      const { elb, collector } = await startFlow();
      const destination = { type: 'spy', config: {}, push: jest.fn() };
      // @ts-expect-error — legacy 3-arg shape is removed from the types in A1/A2
      await elb('walker destination', destination, { settings: { x: 1 } });
      expect(Object.values(collector.destinations)).toHaveLength(0);
    });
  });

  describe('command onApply baseline', () => {
    test('walker consent calls source.on with consent data', async () => {
      const mockOn = jest.fn();
      const { collector } = await startFlow({
        sources: {
          test: {
            code: async () => ({
              type: 'test',
              config: {},
              push: jest.fn(),
              on: mockOn,
            }),
          },
        },
      });

      await collector.command('consent', { marketing: true });

      expect(mockOn).toHaveBeenCalledWith('consent', { marketing: true });
    });

    test('walker session calls source.on with session type', async () => {
      const mockOn = jest.fn();
      const { collector } = await startFlow({
        sources: {
          test: {
            code: async () => ({
              type: 'test',
              config: {},
              push: jest.fn(),
              on: mockOn,
            }),
          },
        },
      });

      collector.session = { id: 'sess-1', isStart: true, storage: false };
      await collector.command('session');

      expect(mockOn).toHaveBeenCalledWith('session', collector.session);
    });

    test('onApply is awaitable', async () => {
      const order: string[] = [];
      const { collector } = await startFlow({
        sources: {
          test: {
            code: async () => ({
              type: 'test',
              config: {},
              push: jest.fn(),
              on: () => {
                order.push('source.on');
              },
            }),
          },
        },
      });

      order.length = 0; // Clear init calls
      await collector.command('consent', { marketing: true });
      order.push('after-consent');

      // source.on should complete before the await resolves
      expect(order).toEqual(['source.on', 'after-consent']);
    });

    test('walker run calls source.on with run type', async () => {
      const mockOn = jest.fn();
      await startFlow({
        sources: {
          test: {
            code: async () => ({
              type: 'test',
              config: {},
              push: jest.fn(),
              on: mockOn,
            }),
          },
        },
      });

      // startFlow calls run by default, so check after init
      expect(mockOn).toHaveBeenCalledWith('run', undefined);
    });
  });

  describe('onApply for all state commands', () => {
    let mockOn: jest.Mock;
    let collector: any;

    beforeEach(async () => {
      mockOn = jest.fn();
      const flow = await startFlow({
        sources: {
          test: {
            code: async () => ({
              type: 'test',
              config: {},
              push: jest.fn(),
              on: mockOn,
            }),
          },
        },
      });
      collector = flow.collector;
      mockOn.mockClear();
    });

    test('walker user passes user data to source.on', async () => {
      await collector.command('user', { id: 'u1', session: 's1' });
      expect(mockOn).toHaveBeenCalledWith('user', { id: 'u1', session: 's1' });
    });

    test('walker custom passes custom data to source.on', async () => {
      await collector.command('custom', { foo: 'bar' });
      expect(mockOn).toHaveBeenCalledWith('custom', { foo: 'bar' });
    });

    test('walker globals passes globals data to source.on', async () => {
      await collector.command('globals', { page: 'home' });
      expect(mockOn).toHaveBeenCalledWith('globals', { page: 'home' });
    });

    test('walker config passes config data to source.on', async () => {
      await collector.command('config', { globalsStatic: { x: 1 } });
      expect(mockOn).toHaveBeenCalledWith('config', {
        globalsStatic: { x: 1 },
      });
    });
  });

  describe('source.on veto', () => {
    test('onApply source notification captures veto (false return)', async () => {
      const vetoOn = jest.fn().mockReturnValue(false);
      const normalOn = jest.fn();

      const { collector } = await startFlow({
        sources: {
          veto: {
            code: async () => ({
              type: 'veto',
              config: {},
              push: jest.fn(),
              on: vetoOn,
            }),
          },
          normal: {
            code: async () => ({
              type: 'normal',
              config: {},
              push: jest.fn(),
              on: normalOn,
            }),
          },
        },
      });

      // Both sources still get notified
      vetoOn.mockClear();
      normalOn.mockClear();
      await collector.command('consent', { marketing: true });

      expect(vetoOn).toHaveBeenCalledWith('consent', { marketing: true });
      expect(normalOn).toHaveBeenCalledWith('consent', { marketing: true });

      // Veto doesn't prevent notification - it signals to the before mechanism (future)
    });
  });

  describe('walker hook command', () => {
    test('registers a hook by { name, fn } and the hook fires on next push', async () => {
      const { elb, collector } = await startFlow();
      const prePush = jest.fn((..._args: unknown[]) => undefined);

      await elb('walker hook', {
        name: 'prePush',
        fn: prePush,
      } as never);

      expect(collector.hooks.prePush).toBe(prePush);

      await elb('page view', { title: 'Home' });
      expect(prePush).toHaveBeenCalled();
    });

    test('ignores { name, fn } with missing or wrong-typed fields', async () => {
      const { elb, collector } = await startFlow();
      const hooksBefore = { ...collector.hooks };

      await elb('walker hook', { name: 'prePush' } as never);
      await elb('walker hook', { fn: jest.fn() } as never);
      await elb('walker hook', 'not-an-object' as never);

      expect(collector.hooks).toEqual(hooksBefore);
    });
  });
});

describe('prepareEvent', () => {
  it('injects timing and collector source meta; event-provided values win', async () => {
    const c = await collector({});
    c.timing = Date.now() - 100;
    const out = prepareEvent(c, { name: 'page view' });
    expect(out.source).toMatchObject({ type: 'collector', schema: '4' });
    expect(typeof out.timing).toBe('number');
    const overridden = prepareEvent(c, {
      source: { type: 'ga4', schema: '4' },
    });
    expect(overridden.source).toEqual({ type: 'ga4', schema: '4' });
  });

  it('feeds createEvent so enrichment is unchanged', async () => {
    const c = await collector({});
    const event = createEvent(c, prepareEvent(c, { name: 'page view' }));
    expect(event.entity).toBe('page');
    expect(event.action).toBe('view');
    expect(event.source).toMatchObject({ type: 'collector', schema: '4' });
  });
});

describe('enrichEvent', () => {
  it('enriches a partial event with entity, action, id, timestamp, and source', async () => {
    const c = await collector({});
    const event = enrichEvent(c, { name: 'page view' });
    expect(event.entity).toBe('page');
    expect(event.action).toBe('view');
    expect(typeof event.id).toBe('string');
    expect(typeof event.timestamp).toBe('number');
    expect(event.source).toMatchObject({ type: 'collector', schema: '4' });
  });

  it('equals createEvent(collector, prepareEvent(collector, ...))', async () => {
    const c = await collector({});
    const partial: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      id: 'fixed',
    };
    const viaEnrich = enrichEvent(c, partial);
    const viaCompose = createEvent(c, prepareEvent(c, partial));
    // Both paths produce the same event. `source.count` is a per-run sequence
    // that legitimately advances on each createEvent call, so compare it
    // independently and assert deep equality on everything else.
    expect(viaEnrich.source.count).toBe(1);
    expect(viaCompose.source.count).toBe(2);
    expect({ ...viaEnrich, source: { ...viaEnrich.source, count: 0 } }).toEqual(
      {
        ...viaCompose,
        source: { ...viaCompose.source, count: 0 },
      },
    );
  });
});
