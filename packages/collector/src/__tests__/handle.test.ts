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
});
