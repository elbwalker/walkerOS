import type { Destination, WalkerOS } from '@walkerOS/core';
import { createCollector } from '..';
import { commonHandleCommand } from '../handle';

describe('Handle Commands', () => {
  let mockDestinationPush: jest.Mock;
  let mockDestinationInit: jest.Mock;
  let mockDestination: Destination.Destination;

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
      const { elb, collector } = await createCollector({});

      // Initially no destinations
      expect(Object.keys(collector.destinations)).toHaveLength(0);

      // Add destination without config
      await elb('walker destination', mockDestination);

      // Destination should be added with some default config
      expect(Object.keys(collector.destinations)).toHaveLength(1);
      const destinationId = Object.keys(collector.destinations)[0];
      expect(collector.destinations[destinationId]).toBeDefined();
      expect(collector.destinations[destinationId].config).toBeDefined();
    });

    test('adds destination with config including custom id', async () => {
      const { elb, collector } = await createCollector({});

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

      // Add destination with config
      await elb('walker destination', mockDestination, customConfig);

      // Destination should be added with custom id and config
      expect(Object.keys(collector.destinations)).toEqual(['my-custom-id']);
      expect(collector.destinations['my-custom-id']).toBeDefined();
      expect(collector.destinations['my-custom-id'].config).toEqual(
        customConfig,
      );
    });

    test('adds destination with config and stores it properly', async () => {
      const { elb, collector } = await createCollector({});

      const customConfig: Destination.Config = {
        id: 'test-destination',
        settings: { apiKey: 'test-key' },
      };

      // Add destination with config
      await elb('walker destination', mockDestination, customConfig);

      // Destination should be added with custom config
      expect(collector.destinations['test-destination']).toBeDefined();
      expect(collector.destinations['test-destination'].config).toEqual(
        customConfig,
      );
    });

    test('handles destination config through commonHandleCommand', async () => {
      const { collector } = await createCollector({});

      const customConfig: Destination.Config = {
        id: 'cmd-test',
        settings: { foo: 'bar' },
      };

      // Call commonHandleCommand directly
      await commonHandleCommand(
        collector,
        'destination',
        mockDestination,
        customConfig,
      );

      // Destination should be added with config
      expect(collector.destinations['cmd-test']).toBeDefined();
      expect(collector.destinations['cmd-test'].config).toEqual(customConfig);
    });
  });
});
