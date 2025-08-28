import type { WalkerOS, Collector } from '@walkeros/core';
import { createDestination } from '@walkeros/core';
import destinationAPI from '@walkeros/web-destination-api';
import type {
  FlowConfiguration,
  FlowNode,
  FlowCapture,
  CaptureCallback,
} from './types';
import { createInterceptor } from './interceptor';

export interface SimulationFactory {
  createCollectorConfig(
    flowConfig: FlowConfiguration,
    captureCallback: CaptureCallback,
  ): Promise<{
    collectorConfig: Collector.Config;
    sourceConfigs: Array<{
      nodeId: string;
      config: Record<string, unknown>;
    }>;
    destinationConfigs: Array<{
      nodeId: string;
      config: Record<string, unknown>;
    }>;
  }>;
}

export function createSimulationFactory(
  simulationId: string,
): SimulationFactory {
  const interceptor = createInterceptor(simulationId, () => {});

  async function createCollectorConfig(
    flowConfig: FlowConfiguration,
    captureCallback: CaptureCallback,
  ): Promise<{
    collectorConfig: Collector.Config;
    sourceConfigs: Array<{
      nodeId: string;
      config: Record<string, unknown>;
    }>;
    destinationConfigs: Array<{
      nodeId: string;
      config: Record<string, unknown>;
    }>;
  }> {
    const collectorNode = flowConfig.nodes.find(
      (node) => node.type === 'collector',
    );
    if (!collectorNode) {
      throw new Error('Flow configuration must contain a collector node');
    }

    const sourceNodes = flowConfig.nodes.filter(
      (node) => node.type === 'source',
    );
    const destinationNodes = flowConfig.nodes.filter(
      (node) => node.type === 'destination',
    );

    const collectorConfig = {
      dryRun: false,
      destinations: {},
      ...(collectorNode.config || {}),
    } as Collector.Config;

    const sourceConfigs = sourceNodes.map((node) => ({
      nodeId: node.id,
      config: node.config || {},
    }));

    const destinationConfigs = destinationNodes.map((node) => {
      const baseConfig = {
        ...(node.config || {}),
      };

      if (node.destinationType === 'gtag') {
        return {
          nodeId: node.id,
          config: baseConfig,
        };
      } else if (node.destinationType === 'api') {
        return {
          nodeId: node.id,
          config: baseConfig,
        };
      }

      throw new Error(`Unsupported destination type: ${node.destinationType}`);
    });

    // Create destinations for each destination node
    destinationNodes.forEach((destNode) => {
      const interceptor = createInterceptor(simulationId, captureCallback);
      const wrapperConfig = interceptor.createWrapperConfig(
        destNode.id,
        'destination_output',
      );

      const nodeConfig = (destNode.config as any) || {};

      let destinationInstance;

      if (destNode.destinationType === 'api') {
        // Use real API destination with flow config settings
        const settings = nodeConfig.settings || {};
        destinationInstance = createDestination(destinationAPI, {
          settings: {
            url: settings.endpoint,
            method: settings.method,
            ...settings,
          },
          mapping: nodeConfig.mapping,
          wrapper: wrapperConfig,
        });
      } else {
        throw new Error(
          `Unsupported destination type: ${destNode.destinationType}. Only real walkerOS destinations are supported.`,
        );
      }

      collectorConfig.destinations![destNode.id] = destinationInstance;
    });

    return {
      collectorConfig,
      sourceConfigs,
      destinationConfigs,
    };
  }

  return {
    createCollectorConfig,
  };
}
