import type { WalkerOS } from '@walkeros/core';
import type {
  FlowConfiguration,
  SimulationResult,
  SimulationOptions,
  FlowNode,
  FlowEdge,
  FlowCapture,
  SimulationTrace,
  SimulationSummary,
  SimulationError,
} from './types';
import { SimulationRunner, createSimulationRunner } from './runner';
import { createPackageWrappers } from './wrappers';
import { createSimulationFactory } from './factory';
import { createInterceptor, createCaptureHandler } from './interceptor';

export interface WalkerOSSimulator {
  simulate(
    flowConfig: FlowConfiguration,
    events: readonly WalkerOS.Event[],
    options?: SimulationOptions,
  ): Promise<SimulationResult>;

  validateFlowConfiguration(flowConfig: FlowConfiguration): {
    isValid: boolean;
    errors: string[];
  };
}

export function createSimulator(simulationId?: string): WalkerOSSimulator {
  const runner = createSimulationRunner(simulationId);

  async function simulate(
    flowConfig: FlowConfiguration,
    events: readonly WalkerOS.Event[],
    options: SimulationOptions = {},
  ): Promise<SimulationResult> {
    const validation = validateFlowConfiguration(flowConfig);
    if (!validation.isValid) {
      throw new Error(
        `Invalid flow configuration: ${validation.errors.join(', ')}`,
      );
    }

    return runner.simulate(flowConfig, events, options);
  }

  function validateFlowConfiguration(flowConfig: FlowConfiguration): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!flowConfig.nodes || flowConfig.nodes.length === 0) {
      errors.push('Flow configuration must contain at least one node');
    }

    const collectorNodes = flowConfig.nodes.filter(
      (node) => node.type === 'collector',
    );
    if (collectorNodes.length !== 1) {
      errors.push('Flow configuration must contain exactly one collector node');
    }

    const sourceNodes = flowConfig.nodes.filter(
      (node) => node.type === 'source',
    );
    if (sourceNodes.length === 0) {
      errors.push('Flow configuration must contain at least one source node');
    }

    const destinationNodes = flowConfig.nodes.filter(
      (node) => node.type === 'destination',
    );
    if (destinationNodes.length === 0) {
      errors.push(
        'Flow configuration must contain at least one destination node',
      );
    }

    for (const node of flowConfig.nodes) {
      if (!node.id) {
        errors.push(`Node is missing required 'id' property`);
      }
      if (
        !node.type ||
        !['source', 'collector', 'destination'].includes(node.type)
      ) {
        errors.push(`Node ${node.id} has invalid type: ${node.type}`);
      }
      if (node.type === 'source' && !node.sourceType) {
        errors.push(`Source node ${node.id} is missing 'sourceType' property`);
      }
      if (node.type === 'destination' && !node.destinationType) {
        errors.push(
          `Destination node ${node.id} is missing 'destinationType' property`,
        );
      }
    }

    const nodeIds = new Set();
    for (const node of flowConfig.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    for (const edge of flowConfig.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references unknown source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references unknown target node: ${edge.target}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  return {
    simulate,
    validateFlowConfiguration,
  };
}

export async function simulateEvents(
  flowConfig: FlowConfiguration,
  events: readonly WalkerOS.Event[],
  options: SimulationOptions = {},
): Promise<SimulationResult> {
  const simulator = createSimulator(options.simulationId);
  return simulator.simulate(flowConfig, events, options);
}

export type {
  FlowConfiguration,
  FlowNode,
  FlowEdge,
  FlowCapture,
  SimulationTrace,
  SimulationSummary,
  SimulationError,
  SimulationResult,
  SimulationOptions,
};

export {
  SimulationRunner,
  createSimulationRunner,
  createPackageWrappers,
  createSimulationFactory,
  createInterceptor,
  createCaptureHandler,
};
