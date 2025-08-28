import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSimulator } from '../index';
import type { FlowConfiguration } from '../types';
import type { WalkerOS } from '@walkeros/core';

// Mock walkerOS packages for integration test
jest.mock('@walkeros/collector', () => ({
  createCollector: jest.fn().mockResolvedValue({
    collector: {
      push: jest.fn(async (event, data, options) => {
        // Simulate successful processing
        return Promise.resolve();
      }),
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

// Remove mock - we want to test the real API destination package
// jest.mock('@walkeros/web-destination-api', () => ({
//   createApiDestination: jest.fn().mockResolvedValue({
//     push: jest.fn(),
//   }),
// }));

describe('Integration Tests', () => {
  const examplesDir = resolve(__dirname, '../../examples');

  function loadExampleFile<T>(filename: string): T {
    const filePath = resolve(examplesDir, filename);
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  }

  describe('Example Files Integration', () => {
    it('successfully loads and validates example flow configuration', () => {
      const flowConfig = loadExampleFile<FlowConfiguration>('flow-config.json');

      expect(flowConfig).toBeDefined();
      expect(flowConfig.nodes).toHaveLength(4); // browser, collector, gtag, api
      expect(flowConfig.edges).toHaveLength(3); // source->collector, collector->gtag, collector->api

      const simulator = createSimulator();
      const validation = simulator.validateFlowConfiguration(flowConfig);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('successfully loads example events', () => {
      const events =
        loadExampleFile<readonly WalkerOS.Event[]>('test-events.json');

      expect(events).toBeDefined();
      expect(events).toHaveLength(3); // page view, product view, product add

      // Validate event format
      events.forEach((event) => {
        expect(event.event).toBeDefined();
        expect(event.event.split(' ')).toHaveLength(2); // ENTITY ACTION format
        expect(event.data).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.id).toBeDefined();
      });
    });

    it('runs complete simulation with example files', async () => {
      const flowConfig = loadExampleFile<FlowConfiguration>('flow-config.json');
      const events =
        loadExampleFile<readonly WalkerOS.Event[]>('test-events.json');

      const simulator = createSimulator('integration-test');
      const result = await simulator.simulate(flowConfig, events);

      expect(result).toBeDefined();
      expect(result.summary.totalEvents).toBe(3);
      expect(result.summary.successfulEvents).toBe(3);
      expect(result.summary.failedEvents).toBe(0);

      expect(result.traces).toHaveLength(3);

      // Verify all events are processed
      result.traces.forEach((trace, index) => {
        expect(trace.inputEvent).toEqual(events[index]);
        expect(trace.simulationId).toContain('integration-test');
        expect(trace.captures).toBeDefined();
        expect(trace.errors).toHaveLength(0);
      });

      // Verify all nodes are processed
      const processedNodes = result.summary.nodesProcessed;
      expect(processedNodes).toContain('browser-source-1');
      expect(processedNodes).toContain('collector-1');
      expect(processedNodes).toContain('gtag-dest-1');
      expect(processedNodes).toContain('api-dest-1');
    });

    it('handles event mapping correctly', async () => {
      const flowConfig = loadExampleFile<FlowConfiguration>('flow-config.json');
      const events =
        loadExampleFile<readonly WalkerOS.Event[]>('test-events.json');

      // Find gtag destination configuration
      const gtagDest = flowConfig.nodes.find(
        (node) =>
          node.type === 'destination' && node.destinationType === 'gtag',
      );
      expect(gtagDest).toBeDefined();
      expect(gtagDest!.config).toBeDefined();

      // Verify mapping configuration exists
      const config = gtagDest!.config as any;
      expect(config.mapping).toBeDefined();
      expect(config.mapping.product).toBeDefined();
      expect(config.mapping.product.view).toBeDefined();
      expect(config.mapping.product.view.name).toBe('view_item');
      expect(config.mapping.product.add.name).toBe('add_to_cart');
      expect(config.mapping.page.view.name).toBe('page_view');

      // Run simulation
      const simulator = createSimulator();
      const result = await simulator.simulate(flowConfig, events);

      expect(result.summary.successfulEvents).toBe(3);
    });

    it('respects consent configuration', async () => {
      const flowConfig = loadExampleFile<FlowConfiguration>('flow-config.json');
      const events =
        loadExampleFile<readonly WalkerOS.Event[]>('test-events.json');

      // Verify all events have consent enabled
      events.forEach((event) => {
        expect(event.consent).toBeDefined();
        expect(event.consent?.functional).toBe(true);
        expect(event.consent?.marketing).toBe(true);
      });

      const simulator = createSimulator();
      const result = await simulator.simulate(flowConfig, events);

      // All events should be processed successfully with proper consent
      expect(result.summary.successfulEvents).toBe(3);
      expect(result.summary.failedEvents).toBe(0);
    });

    it('validates destination configurations', async () => {
      const flowConfig = loadExampleFile<FlowConfiguration>('flow-config.json');

      // Find destinations and validate their configurations
      const gtagDest = flowConfig.nodes.find(
        (node) =>
          node.type === 'destination' && node.destinationType === 'gtag',
      );
      const apiDest = flowConfig.nodes.find(
        (node) => node.type === 'destination' && node.destinationType === 'api',
      );

      expect(gtagDest).toBeDefined();
      expect(apiDest).toBeDefined();

      // Validate gtag configuration
      const gtagConfig = gtagDest!.config as any;
      expect(gtagConfig.settings).toBeDefined();
      expect(gtagConfig.settings.ga4).toBeDefined();
      expect(gtagConfig.settings.ga4.measurementId).toBe('G-XXXXXXXXXX');

      // Validate API configuration
      const apiConfig = apiDest!.config as any;
      expect(apiConfig.settings).toBeDefined();
      expect(apiConfig.settings.endpoint).toBe(
        'https://api.example.com/events',
      );
      expect(apiConfig.settings.apiKey).toBe('test-key');

      // Ensure simulation can process these configurations
      const events =
        loadExampleFile<readonly WalkerOS.Event[]>('test-events.json');
      const simulator = createSimulator();
      const result = await simulator.simulate(flowConfig, events);

      expect(result.summary.successfulEvents).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('handles simulation errors gracefully', async () => {
      // Create an invalid flow config that should cause errors
      const invalidFlowConfig: FlowConfiguration = {
        nodes: [
          {
            id: 'invalid-collector',
            type: 'collector',
            config: {
              // Invalid config that might cause issues
            },
          },
        ],
        edges: [],
      };

      const events =
        loadExampleFile<readonly WalkerOS.Event[]>('test-events.json');

      const simulator = createSimulator();

      // This should throw an error due to missing source nodes
      await expect(
        simulator.simulate(invalidFlowConfig, events),
      ).rejects.toThrow('Invalid flow configuration');
    });
  });
});
