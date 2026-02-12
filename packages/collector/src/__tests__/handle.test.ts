import type { Collector } from '@walkeros/core';
import type { Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';
import { commonHandleCommand } from '../handle';

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

      // Add destination using new format: { code: destination }
      await elb('walker destination', { code: mockDestination }, customConfig);

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

      // Add destination using new format: { code: destination }
      await elb('walker destination', { code: mockDestination }, customConfig);

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

      // Call commonHandleCommand directly using new format: { code: destination }
      await commonHandleCommand(
        collector,
        'destination',
        { code: mockDestination },
        customConfig,
      );

      // Destination should be added with config
      expect(collector.destinations['cmd-test']).toBeDefined();
      expect(collector.destinations['cmd-test'].config).toEqual(customConfig);
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
      await collector.command('config', { tagging: 2 });
      expect(mockOn).toHaveBeenCalledWith('config', { tagging: 2 });
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

      // Veto doesn't prevent notification — it signals to the before mechanism (future)
    });
  });
});
