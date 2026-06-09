import { z } from 'zod';
import {
  simulateSource,
  simulateTransformer,
  simulateDestination,
  simulateCollector,
} from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import type { Ingest, Simulation, WalkerOS } from '@walkeros/core';
import { SimulateOutputShape } from '../schemas/output.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import { resolveConfigPath } from './resolve-config-path.js';
import { getOrBuildBundle } from './bundle-cache.js';

interface DestinationSummary {
  received: boolean;
  calls: number;
  payload?: unknown;
}

const TITLE = 'Simulate Flow';
const DESCRIPTION =
  'Simulate events through a walkerOS flow without making real API calls. ' +
  'For destinations: event is a walkerOS event { name: "entity action", data: {...} }. ' +
  'For sources: event is { content, trigger?: { type?, options? } }, where content is the ' +
  'walkerOS event { name: "entity action", data: {...} }. ' +
  'step (required) targets the step to simulate, e.g. "destination.gtag". ' +
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
        'For sources: { content, trigger? } where content is the walkerOS event ' +
        '{ name, data }. ' +
        'Can also be a JSON string or file path.',
    ),
  flow: schemas.SimulateInputShape.flow,
  platform: schemas.SimulateInputShape.platform,
  // Override the (optional) CLI `step` shape: the simulate handler hard-requires
  // a target step (no all-steps mode), so the registered schema must be honest.
  step: z
    .string()
    .describe(
      'Required. Target step as "type.name" — e.g. "source.demo", "destination.gtag", "transformer.router".',
    ),
  verbose: z
    .boolean()
    .optional()
    .describe('Include full payload per destination (default: false)'),
  ingest: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Pipeline context a transformer reads via ctx.ingest, e.g. { url } for a ' +
        'request decoder. Only used for transformer steps.',
    ),
  state: z
    .object({
      consent: z.record(z.string(), z.unknown()).optional(),
      user: z.record(z.string(), z.unknown()).optional(),
      globals: z.record(z.string(), z.unknown()).optional(),
      timing: z.number().optional(),
    })
    .optional()
    .describe(
      'Collector-state snapshot for collector steps: consent/user/globals/timing. ' +
        'Seeds the collector before enrichment runs.',
    ),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createFlowSimulateToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'flow_simulate',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowSimulateHandlerBody(client, input),
  };
}

async function flowSimulateHandlerBody(client: ToolClient, input: unknown) {
  const { configPath, event, flow, platform, step, verbose, ingest, state } =
    (input ?? {}) as {
      configPath: string;
      event?: Record<string, unknown> | string;
      flow?: string;
      platform?: 'web' | 'server';
      step?: string;
      verbose?: boolean;
      ingest?: Omit<Ingest, '_meta'>;
      state?: {
        consent?: WalkerOS.Consent;
        user?: WalkerOS.User;
        globals?: WalkerOS.Properties;
        timing?: number;
      };
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

    // Accept a cloud flow/config id as configPath, resolving it to inline JSON.
    const resolvedConfigPath = await resolveConfigPath(client, configPath);

    // Reuse a prebuilt bundle across calls with the same resolved config. The
    // simulate fns take their fast `mode: 'prebuilt'` branch when given a
    // bundlePath, skipping the per-call rebuild. On any bundle failure fall back
    // to undefined so the simulate fn rebuilds and surfaces its canonical error.
    let bundlePath: string | undefined;
    try {
      bundlePath = await getOrBuildBundle(resolvedConfigPath);
    } catch {
      bundlePath = undefined;
    }

    let result: Simulation.Result;

    switch (stepType) {
      case 'source':
        result = await simulateSource(resolvedConfigPath, resolvedEvent, {
          sourceId: stepId,
          bundlePath,
          flow,
          silent: true,
        });
        break;

      case 'transformer':
        result = await simulateTransformer(
          resolvedConfigPath,
          resolvedEvent as WalkerOS.DeepPartialEvent,
          {
            transformerId: stepId,
            bundlePath,
            flow,
            silent: true,
            ingest,
          },
        );
        break;

      case 'collector':
        result = await simulateCollector(
          resolvedConfigPath,
          resolvedEvent as WalkerOS.DeepPartialEvent,
          {
            collectorName: stepId,
            bundlePath,
            flow,
            silent: true,
            state,
          },
        );
        break;

      case 'destination':
        result = await simulateDestination(
          resolvedConfigPath,
          resolvedEvent as WalkerOS.DeepPartialEvent,
          {
            destinationId: stepId,
            bundlePath,
            flow,
            silent: true,
          },
        );
        break;

      default:
        throw new Error(
          `Unknown step type "${stepType}". Use "source", "collector", "transformer", or "destination".`,
        );
    }

    const success = !result.error;
    const errorMessage = result.error?.message;

    // Source simulation: captured events are result.events
    if (result.step === 'source') {
      const eventCount = result.events.length;
      const summary = `Source captured ${eventCount} event${eventCount !== 1 ? 's' : ''}`;

      return mcpResult(
        {
          success,
          error: errorMessage,
          summary,
          capturedEvents: result.events,
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

    // Transformer simulation: surface the transformed events
    if (result.step === 'transformer') {
      return mcpResult(
        {
          success,
          error: errorMessage,
          summary: `Transformer processed event`,
          capturedEvents: result.events,
          duration: result.duration,
        },
        {
          next: ['Use flow_bundle to build for production'],
        },
      );
    }

    // Collector simulation: surface the enriched event
    if (result.step === 'collector') {
      return mcpResult(
        {
          success,
          error: errorMessage,
          summary: `Collector enriched event`,
          capturedEvents: result.events,
          duration: result.duration,
        },
        {
          next: ['Use flow_simulate with a destination step to test delivery'],
        },
      );
    }

    // Destination simulation: count intercepted env calls, key by step name
    const destinations: Record<string, DestinationSummary> = {};
    const callCount = result.calls.length;
    const destSummary: DestinationSummary = {
      received: callCount > 0,
      calls: callCount,
    };
    if (verbose && callCount > 0) {
      destSummary.payload = result.calls;
    }
    destinations[result.name] = destSummary;

    const destCount = Object.keys(destinations).length;
    const receivedCount = Object.values(destinations).filter(
      (d) => d.received,
    ).length;

    const warnings: string[] = [];
    if (receivedCount === 0) {
      warnings.push(
        'Destination did not receive the event. Common causes: ' +
          '(1) destination config has consent: { marketing: true } but event lacks matching consent, ' +
          '(2) mapping rules do not match the event name, ' +
          '(3) policy redacted required fields. ' +
          'Add consent to the event: { name: "...", data: {...}, consent: { marketing: true } }.',
      );
    }

    const resultObj = {
      success,
      error: errorMessage,
      summary: `${receivedCount}/${destCount} destinations received the event`,
      destinations,
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

export function registerFlowSimulateTool(
  server: McpServer,
  client: ToolClient,
) {
  const spec = createFlowSimulateToolSpec(client);
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
