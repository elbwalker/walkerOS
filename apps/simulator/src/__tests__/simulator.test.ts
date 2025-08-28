import { createSimulator, simulateEvents } from '../index';
import type { FlowConfiguration } from '../types';
import type { WalkerOS } from '@walkeros/core';

// Mock the walkerOS packages
jest.mock('@walkeros/collector', () => ({
  createCollector: jest.fn().mockResolvedValue({
    collector: {
      push: jest.fn().mockResolvedValue(undefined),
    },
  }),
}));

jest.mock('@walkeros/web-source-browser', () => ({
  createBrowserSource: jest.fn().mockResolvedValue({
    elb: jest.fn(),
  }),
}));

jest.mock('@walkeros/web-destination-gtag', () => ({
  createGtagDestination: jest.fn().mockResolvedValue({
    push: jest.fn(),
  }),
}));

jest.mock('@walkeros/web-destination-api', () => ({
  createApiDestination: jest.fn().mockResolvedValue({
    push: jest.fn(),
  }),
}));

describe('WalkerOS Simulator', () => {
  const sampleFlowConfig: FlowConfiguration = {
    nodes: [
      {
        id: 'browser-1',
        type: 'source',
        sourceType: 'browser',
        config: {
          prefix: 'data-elb',
          scope: 'body',
          pageview: true,
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
            ga4: { measurementId: 'G-TEST123' },
          },
        },
      },
    ],
    edges: [
      { source: 'browser-1', target: 'collector-1' },
      { source: 'collector-1', target: 'gtag-1' },
    ],
  };

  const sampleEvents: readonly WalkerOS.Event[] = [
    {
      event: 'page view',
      data: {
        title: 'Test Page',
        url: 'https://test.com',
      },
      context: {
        stage: ['test', 1],
      },
      globals: {
        language: 'en',
        currency: 'USD',
      },
      user: {
        id: 'user123',
        device: 'device456',
      },
      consent: {
        functional: true,
        marketing: true,
      },
      id: '1647261462000-test-1',
      timestamp: 1647261462000,
      entity: 'page',
      action: 'view',
    },
    {
      event: 'product view',
      data: {
        id: 'P123',
        name: 'Test Product',
        price: 99.99,
      },
      globals: {
        language: 'en',
        currency: 'USD',
      },
      user: {
        id: 'user123',
        device: 'device456',
      },
      consent: {
        functional: true,
        marketing: true,
      },
      id: '1647261462001-test-2',
      timestamp: 1647261462001,
      entity: 'product',
      action: 'view',
    },
  ];

  describe('createSimulator', () => {
    it('creates simulator instance with custom ID', () => {
      const customId = 'my-simulator';
      const simulator = createSimulator(customId);

      expect(simulator).toBeDefined();
      expect(simulator.simulate).toBeDefined();
      expect(simulator.validateFlowConfiguration).toBeDefined();
    });

    it('creates simulator instance with generated ID', () => {
      const simulator = createSimulator();

      expect(simulator).toBeDefined();
    });
  });

  describe('validateFlowConfiguration', () => {
    it('validates correct flow configuration', () => {
      const simulator = createSimulator();
      const result = simulator.validateFlowConfiguration(sampleFlowConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects configuration without nodes', () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = { nodes: [], edges: [] };
      const result = simulator.validateFlowConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Flow configuration must contain at least one node',
      );
    });

    it('rejects configuration without collector', () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = {
        nodes: [{ id: 'source-1', type: 'source', sourceType: 'browser' }],
        edges: [],
      };
      const result = simulator.validateFlowConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Flow configuration must contain exactly one collector node',
      );
    });

    it('rejects configuration without sources', () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = {
        nodes: [{ id: 'collector-1', type: 'collector' }],
        edges: [],
      };
      const result = simulator.validateFlowConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Flow configuration must contain at least one source node',
      );
    });

    it('rejects configuration without destinations', () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = {
        nodes: [
          { id: 'source-1', type: 'source', sourceType: 'browser' },
          { id: 'collector-1', type: 'collector' },
        ],
        edges: [],
      };
      const result = simulator.validateFlowConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Flow configuration must contain at least one destination node',
      );
    });

    it('rejects nodes with missing properties', () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = {
        nodes: [
          { id: '', type: 'source', sourceType: 'browser' } as any,
          { id: 'collector-1', type: 'invalid' } as any,
          { id: 'source-2', type: 'source' } as any, // Missing sourceType
          { id: 'dest-1', type: 'destination' } as any, // Missing destinationType
        ],
        edges: [],
      };
      const result = simulator.validateFlowConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('missing'),
          expect.stringContaining('invalid type'),
        ]),
      );
    });

    it('rejects duplicate node IDs', () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = {
        nodes: [
          { id: 'duplicate', type: 'source', sourceType: 'browser' },
          { id: 'duplicate', type: 'collector' },
        ],
        edges: [],
      };
      const result = simulator.validateFlowConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate node ID: duplicate');
    });

    it('rejects edges with unknown nodes', () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = {
        nodes: [
          { id: 'source-1', type: 'source', sourceType: 'browser' },
          { id: 'collector-1', type: 'collector' },
          { id: 'dest-1', type: 'destination', destinationType: 'gtag' },
        ],
        edges: [
          { source: 'unknown-source', target: 'collector-1' },
          { source: 'collector-1', target: 'unknown-dest' },
        ],
      };
      const result = simulator.validateFlowConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Edge references unknown source node: unknown-source',
          'Edge references unknown target node: unknown-dest',
        ]),
      );
    });
  });

  describe('simulate', () => {
    it('throws error for invalid flow configuration', async () => {
      const simulator = createSimulator();
      const invalidConfig: FlowConfiguration = { nodes: [], edges: [] };

      await expect(
        simulator.simulate(invalidConfig, sampleEvents),
      ).rejects.toThrow('Invalid flow configuration');
    });

    it('processes events and returns simulation result', async () => {
      const simulator = createSimulator();

      const result = await simulator.simulate(sampleFlowConfig, sampleEvents);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.traces).toBeDefined();
      expect(result.traces).toHaveLength(sampleEvents.length);

      expect(result.summary.totalEvents).toBe(2);
      expect(result.summary.successfulEvents).toBe(2);
      expect(result.summary.failedEvents).toBe(0);
    });

    it('includes input events in traces', async () => {
      const simulator = createSimulator();

      const result = await simulator.simulate(sampleFlowConfig, sampleEvents);

      result.traces.forEach((trace, index) => {
        expect(trace.inputEvent).toEqual(sampleEvents[index]);
        expect(trace.simulationId).toBeDefined();
        expect(trace.captures).toBeDefined();
        expect(trace.errors).toBeDefined();
      });
    });
  });

  describe('simulateEvents', () => {
    it('creates simulator and runs simulation', async () => {
      const result = await simulateEvents(sampleFlowConfig, sampleEvents, {
        simulationId: 'test-simulation',
      });

      expect(result).toBeDefined();
      expect(result.summary.totalEvents).toBe(2);
    });

    it('handles simulation options', async () => {
      const result = await simulateEvents(sampleFlowConfig, sampleEvents, {
        simulationId: 'custom-id',
        captureExternalCalls: true,
      });

      expect(result).toBeDefined();
      expect(result.traces[0].simulationId).toContain('custom-id');
    });
  });
});
