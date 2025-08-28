import type { WalkerOS, Collector } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import type {
  FlowConfiguration,
  FlowCapture,
  SimulationTrace,
  SimulationResult,
  SimulationSummary,
  SimulationOptions,
  SimulationError,
} from './types';
import { createSimulationFactory } from './factory';
import { createCaptureHandler } from './interceptor';

export class SimulationRunner {
  private readonly simulationId: string;
  private readonly factory: ReturnType<typeof createSimulationFactory>;

  constructor(simulationId: string) {
    this.simulationId = simulationId;
    this.factory = createSimulationFactory(simulationId);
  }

  async simulate(
    flowConfig: FlowConfiguration,
    events: readonly WalkerOS.Event[],
    options: SimulationOptions = {},
  ): Promise<SimulationResult> {
    const traces: SimulationTrace[] = [];
    const processedNodes = new Set<string>();
    let successfulEvents = 0;
    let failedEvents = 0;

    for (const inputEvent of events) {
      const traceId =
        options.simulationId || `${this.simulationId}-${Date.now()}`;
      const captures: FlowCapture[] = [];
      const errors: SimulationError[] = [];

      try {
        const captureHandler = createCaptureHandler(traceId, captures, errors);

        const { collectorConfig, sourceConfigs, destinationConfigs } =
          await this.factory.createCollectorConfig(flowConfig, captureHandler);

        const { collector } = await createCollector(collectorConfig);

        captures.push({
          stage: 'collector_input',
          nodeId:
            flowConfig.nodes.find((n) => n.type === 'collector')?.id ||
            'collector',
          data: inputEvent,
        });

        await collector.push(inputEvent);

        captures.push({
          stage: 'collector_output',
          nodeId:
            flowConfig.nodes.find((n) => n.type === 'collector')?.id ||
            'collector',
          data: inputEvent,
        });

        sourceConfigs.forEach(({ nodeId }) => processedNodes.add(nodeId));
        destinationConfigs.forEach(({ nodeId }) => processedNodes.add(nodeId));
        processedNodes.add(
          flowConfig.nodes.find((n) => n.type === 'collector')?.id ||
            'collector',
        );

        successfulEvents++;
      } catch (error) {
        const simulationError: SimulationError = {
          stage: 'simulation',
          nodeId: 'runner',
          error: error instanceof Error ? error : new Error(String(error)),
        };
        errors.push(simulationError);
        failedEvents++;
      }

      const trace: SimulationTrace = {
        simulationId: traceId,
        inputEvent,
        captures,
        errors,
      };
      traces.push(trace);
    }

    const summary: SimulationSummary = {
      totalEvents: events.length,
      successfulEvents,
      failedEvents,
      nodesProcessed: Array.from(processedNodes),
    };

    return {
      traces,
      summary,
    };
  }
}

export function createSimulationRunner(
  simulationId?: string,
): SimulationRunner {
  const id =
    simulationId ||
    `simulation-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  return new SimulationRunner(id);
}
