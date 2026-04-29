import { z } from 'zod';
import {
  simulateSource,
  simulateTransformer,
  simulateDestination,
} from '@walkeros/cli';
import type { PushResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { SimulateOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';

interface DestinationSummary {
  received: boolean;
  calls: number;
  payload?: unknown;
}

const TITLE = 'Simulate Flow';
const DESCRIPTION =
  'Simulate events through a walkerOS flow without making real API calls. ' +
  'For destinations: event is a walkerOS event { name: "entity action", data: {...} }. ' +
  'For sources: event is { content: ..., trigger?: { type?, options? }, env?: {...} }. ' +
  'Use step to target a specific step. ' +
  'Use flow_examples to discover available test data. ' +
  'IMPORTANT: Destinations with require (e.g. require: ["consent"]) stay pending until ' +
  'that collector event fires — simulation will error "not found" if require is not satisfied. ' +
  'Remove require from config or provide consent/user events before simulating. ' +
  'Separately, destinations with consent (e.g. consent: { marketing: true }) only receive ' +
  'events where the event includes matching consent. ' +
  'Mapping transforms event names and data at the destination level. ' +
  'Policy redacts or injects fields before mapping runs.';

const inputSchema = {
  configPath: schemas.SimulateInputShape.configPath,
  event: z
    .union([z.record(z.string(), z.unknown()), z.string()])
    .optional()
    .describe(
      'For destinations: { name, data, consent? }. Include consent (e.g. { marketing: true }) ' +
        'to satisfy destination consent requirements. ' +
        'For sources: { content, trigger?, env? }. ' +
        'Can also be a JSON string or file path.',
    ),
  flow: schemas.SimulateInputShape.flow,
  platform: schemas.SimulateInputShape.platform,
  step: schemas.SimulateInputShape.step,
  verbose: z
    .boolean()
    .optional()
    .describe('Include full payload per destination (default: false)'),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createFlowSimulateToolSpec(): ToolSpec {
  return {
    name: 'flow_simulate',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowSimulateHandlerBody(input),
  };
}

async function flowSimulateHandlerBody(input: unknown) {
  const { configPath, event, flow, platform, step, verbose } = (input ??
    {}) as {
    configPath: string;
    event?: Record<string, unknown> | string;
    flow?: string;
    platform?: 'web' | 'server';
    step?: string;
    verbose?: boolean;
  };
  try {
    if (!event) {
      throw new Error(
        'event is required. For sources provide { content, trigger? }, for destinations provide { name, data }.',
      );
    }

    if (!step) {
      throw new Error(
        'step is required. Specify a target like "source.browser", "destination.gtag", or "transformer.demo".',
      );
    }

    // Resolve string event input (JSON string)
    let resolvedEvent: unknown = event;
    if (typeof event === 'string') {
      try {
        resolvedEvent = JSON.parse(event);
      } catch {
        throw new Error(
          'Event string must be valid JSON. Got: ' + event.substring(0, 50),
        );
      }
    }

    // Parse step into type and id
    const dotIndex = step.indexOf('.');
    if (dotIndex === -1) {
      throw new Error(
        `Invalid step format "${step}". Use "type.name" (e.g. "source.browser", "destination.gtag").`,
      );
    }
    const stepType = step.substring(0, dotIndex);
    const stepId = step.substring(dotIndex + 1);

    let result: PushResult;

    switch (stepType) {
      case 'source':
        result = await simulateSource(configPath, resolvedEvent, {
          sourceId: stepId,
          flow,
          silent: true,
        });
        break;

      case 'transformer':
        result = await simulateTransformer(
          configPath,
          resolvedEvent as import('@walkeros/core').WalkerOS.DeepPartialEvent,
          {
            transformerId: stepId,
            flow,
            silent: true,
          },
        );
        break;

      case 'destination':
        result = await simulateDestination(
          configPath,
          resolvedEvent as import('@walkeros/core').WalkerOS.DeepPartialEvent,
          {
            destinationId: stepId,
            flow,
            silent: true,
          },
        );
        break;

      default:
        throw new Error(
          `Unknown step type "${stepType}". Use "source", "transformer", or "destination".`,
        );
    }

    // Source simulation returns captured events
    if (result.captured && result.captured.length > 0) {
      const eventCount = result.captured.length;
      const summary = `Source captured ${eventCount} event${eventCount !== 1 ? 's' : ''}`;

      return mcpResult(
        {
          success: result.success,
          error: result.error,
          summary,
          capturedEvents: result.captured,
          duration: result.duration,
        },
        {
          next:
            eventCount > 0
              ? [
                  'Use flow_simulate with a destination step to test downstream processing',
                ]
              : [
                  'Check source package examples with package_get, verify trigger type matches',
                ],
        },
      );
    }

    // Destination/transformer simulation
    const destinations: Record<string, DestinationSummary> = {};

    // Build destinations summary from elbResult.done
    if (
      result.elbResult &&
      typeof result.elbResult === 'object' &&
      'done' in result.elbResult &&
      result.elbResult.done
    ) {
      const done = result.elbResult.done as Record<string, unknown>;
      for (const name of Object.keys(done)) {
        destinations[name] = { received: true, calls: 0 };
      }
    }

    // Also check usage (call tracking from mock envs)
    if (result.usage) {
      for (const [name, calls] of Object.entries(result.usage)) {
        const summary: DestinationSummary = {
          received: calls.length > 0,
          calls: calls.length,
        };
        if (verbose && calls.length > 0) {
          summary.payload = calls;
        }
        destinations[name] = summary;
      }
    }

    const destCount = Object.keys(destinations).length;
    const receivedCount = Object.values(destinations).filter(
      (d) => d.received,
    ).length;

    const warnings: string[] = [];
    if (stepType === 'destination' && destCount === 0) {
      warnings.push(
        'Destination did not receive the event. Common causes: ' +
          '(1) destination config has consent: { marketing: true } but event lacks matching consent, ' +
          '(2) mapping rules do not match the event name, ' +
          '(3) policy redacted required fields. ' +
          'Add consent to the event: { name: "...", data: {...}, consent: { marketing: true } }.',
      );
    }

    const summary =
      stepType === 'transformer'
        ? `Transformer processed event`
        : `${receivedCount}/${destCount} destinations received the event`;

    const resultObj = {
      success: result.success,
      error: result.error,
      summary,
      destinations: destCount > 0 ? destinations : undefined,
      duration: result.duration,
    };

    return mcpResult(resultObj, {
      next: ['Use flow_bundle to build for production'],
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    let hint = 'Run flow_validate for detailed error messages';
    if (msg.includes('not found in collector')) {
      hint =
        'If this destination has require: ["consent"] or require: ["user"], it stays ' +
        'pending until that event fires. For simulation, either remove require from ' +
        'the config or simulate with a flow that omits require on the target destination.';
    }
    return mcpError(error, hint);
  }
}

export function registerFlowSimulateTool(server: McpServer) {
  const spec = createFlowSimulateToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // outputSchema is wire-only; not part of ToolSpec
      outputSchema: SimulateOutputShape,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
