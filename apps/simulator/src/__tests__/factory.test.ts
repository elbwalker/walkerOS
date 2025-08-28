import { createSimulationFactory } from '../factory';
import type { FlowConfiguration, CaptureCallback } from '../types';

describe('SimulationFactory', () => {
  const simulationId = 'test-factory';
  const mockCallback: CaptureCallback = jest.fn();

  const sampleFlowConfig: FlowConfiguration = {
    nodes: [
      {
        id: 'browser-1',
        type: 'source',
        sourceType: 'browser',
        config: {
          prefix: 'data-test',
          scope: 'body',
        },
      },
      {
        id: 'collector-1',
        type: 'collector',
        config: {
          allowed: true,
        },
      },
      {
        id: 'gtag-1',
        type: 'destination',
        destinationType: 'gtag',
        config: {
          settings: {
            ga4: { measurementId: 'G-TEST' },
          },
        },
      },
      {
        id: 'api-1',
        type: 'destination',
        destinationType: 'api',
        config: {
          settings: {
            endpoint: 'https://api.test.com',
          },
        },
      },
    ],
    edges: [
      { source: 'browser-1', target: 'collector-1' },
      { source: 'collector-1', target: 'gtag-1' },
      { source: 'collector-1', target: 'api-1' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCollectorConfig', () => {
    it('throws error when no collector node exists', async () => {
      const factory = createSimulationFactory(simulationId);
      const invalidConfig: FlowConfiguration = {
        nodes: [
          {
            id: 'source-1',
            type: 'source',
            sourceType: 'browser',
          },
        ],
        edges: [],
      };

      await expect(
        factory.createCollectorConfig(invalidConfig, mockCallback),
      ).rejects.toThrow('Flow configuration must contain a collector node');
    });

    it('creates collector config with destinations', async () => {
      const factory = createSimulationFactory(simulationId);

      const result = await factory.createCollectorConfig(
        sampleFlowConfig,
        mockCallback,
      );

      expect(result.collectorConfig).toBeDefined();
      expect(result.collectorConfig.dryRun).toBe(false);
      expect(result.collectorConfig.allowed).toBe(true);
      expect(result.collectorConfig.destinations).toBeDefined();
      expect(result.collectorConfig.destinations!['gtag-1']).toBeDefined();
      expect(result.collectorConfig.destinations!['api-1']).toBeDefined();
    });

    it('creates source configs with wrapper', async () => {
      const factory = createSimulationFactory(simulationId);

      const result = await factory.createCollectorConfig(
        sampleFlowConfig,
        mockCallback,
      );

      expect(result.sourceConfigs).toHaveLength(1);
      expect(result.sourceConfigs[0].nodeId).toBe('browser-1');
      expect(result.sourceConfigs[0].config.prefix).toBe('data-test');
      expect(result.sourceConfigs[0].config.scope).toBe('body');
    });

    it('creates destination configs with correct types', async () => {
      const factory = createSimulationFactory(simulationId);

      const result = await factory.createCollectorConfig(
        sampleFlowConfig,
        mockCallback,
      );

      expect(result.destinationConfigs).toHaveLength(2);

      const gtagConfig = result.destinationConfigs.find(
        (c) => c.nodeId === 'gtag-1',
      );
      const apiConfig = result.destinationConfigs.find(
        (c) => c.nodeId === 'api-1',
      );

      expect(gtagConfig).toBeDefined();
      expect(gtagConfig!.nodeId).toBe('gtag-1');

      expect(apiConfig).toBeDefined();
      expect(apiConfig!.nodeId).toBe('api-1');
    });

    it('throws error for unsupported destination type', async () => {
      const factory = createSimulationFactory(simulationId);
      const invalidConfig: FlowConfiguration = {
        nodes: [
          {
            id: 'collector-1',
            type: 'collector',
          },
          {
            id: 'unknown-dest',
            type: 'destination',
            destinationType: 'unknown',
          },
        ],
        edges: [],
      };

      await expect(
        factory.createCollectorConfig(invalidConfig, mockCallback),
      ).rejects.toThrow('Unsupported destination type: unknown');
    });

    it('applies node config to generated configs', async () => {
      const factory = createSimulationFactory(simulationId);

      const result = await factory.createCollectorConfig(
        sampleFlowConfig,
        mockCallback,
      );

      const sourceConfig = result.sourceConfigs[0];
      expect(sourceConfig.config.prefix).toBe('data-test');
      expect(sourceConfig.config.scope).toBe('body');

      const collectorConfig = result.collectorConfig;
      expect(collectorConfig.allowed).toBe(true);
    });
  });
});
