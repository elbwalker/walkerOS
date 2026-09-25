import { z } from 'zod';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isObject, mcpResult, mcpError } from '@walkeros/core';
import { scrubSecrets, toPrintable } from '@walkeros/core/node';
import type { Flow, Ingest, Simulation, WalkerOS } from '@walkeros/core';
import { SimulateOutputShape } from '../schemas/output.js';
import { FLOW_SIMULATE_DESCRIPTION } from './simulate-description.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import { resolveConfigPath } from './resolve-config-path.js';
import {
  refusalHint,
  unavailableOperation,
  type FlowRuntime,
  type SimulateStepType,
} from '../runtime/types.js';

interface DestinationSummary {
  received: boolean;
  calls: number;
  payload?: unknown;
}

const STEP_TYPES: readonly SimulateStepType[] = [
  'source',
  'transformer',
  'collector',
  'destination',
];

function isStepType(value: string): value is SimulateStepType {
  return STEP_TYPES.some((t) => t === value);
}

/**
 * Simulate results carry recorded vendor calls and events whose values can
 * hold credentials. They egress like a log line: serialize, scrub (masking
 * the values of the secrets the flow references, `known`), then parse back
 * into the structured result.
 */
function scrubbed(
  result: Record<string, unknown>,
  known: readonly string[],
): Record<string, unknown> {
  const text = scrubSecrets(JSON.stringify(toPrintable(result)), { known });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  if (!isObject(parsed))
    throw new Error('Simulation result could not be redacted as JSON.');
  return parsed;
}

/** The error response egresses the same way: its text and structured copy. */
function scrubbedError(
  response: ReturnType<typeof mcpError>,
  known: readonly string[],
): ReturnType<typeof mcpError> {
  let structuredContent: Record<string, unknown>;
  try {
    structuredContent = scrubbed(response.structuredContent, known);
  } catch {
    structuredContent = {
      error: 'Simulation failed; the error could not be redacted.',
    };
  }
  return {
    ...response,
    content: response.content.map((part) => ({
      ...part,
      text: scrubSecrets(part.text, { known }),
    })),
    structuredContent,
  };
}

const TITLE = 'Simulate Flow';
const COMMANDS: readonly [Flow.StepCommand, ...Flow.StepCommand[]] = [
  'config',
  'consent',
  'user',
  'run',
];

const inputSchema = {
  configPath: schemas.SimulateInputShape.configPath,
  event: z
    .union([z.record(z.string(), z.unknown()), z.string()])
    .optional()
    .describe(
      "For destinations: { name, data, consent? }; the event's consent counts " +
        "toward the destination's consent requirement, on top of state.consent. " +
        "With command: the command's data, e.g. { marketing: true } for consent. " +
        'For sources: { content, trigger? } where content is the walkerOS event ' +
        "{ name, data }. A web source's page URL goes in trigger.options.url " +
        '(default http://localhost). ' +
        'Can also be a JSON string or file path.',
    ),
  flow: schemas.SimulateInputShape.flow,
  platform: schemas.SimulateInputShape.platform,
  // Override the (optional) CLI `step` shape: the simulate handler hard-requires
  // a target step (no all-steps mode), so the registered schema must be honest.
  step: z
    .string()
    .describe(
      'Required. Target step as "type.name", e.g. "source.demo", "collector.default", "destination.gtag", "transformer.router". ' +
        'A collector step runs enrichment and then collector.next, returning every event the destinations would receive (none after a stop).',
    ),
  verbose: z
    .boolean()
    .optional()
    .describe('Include full payload per destination (default: false)'),
  ingest: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Pipeline context a step reads via ctx.ingest, e.g. { url } for a ' +
        'request decoder or { ip, userAgent } for a conversion API. Used for ' +
        'transformer, collector and destination steps (their before chains ' +
        'included); _meta is always set by the runtime.',
    ),
  state: z
    .object({
      consent: z.record(z.string(), z.boolean()).optional(),
      user: z.record(z.string(), z.unknown()).optional(),
      globals: z.record(z.string(), z.unknown()).optional(),
      timing: z.number().optional(),
    })
    .optional()
    .describe(
      'Collector state the step starts from. consent: transformer, collector ' +
        'and destination steps (starts a destination that requires consent, ' +
        'and feeds its consent check). user/globals/timing: collector steps, ' +
        'seeded before enrichment runs.',
    ),
  command: z
    .enum(COMMANDS)
    .optional()
    .describe(
      'Destination steps only: run this collector command with event as its ' +
        'data instead of pushing it, as a step example with command does.',
    ),
};

const annotations = {
  // Simulation downloads the packages a config names and runs caller-controlled
  // flow code in process. Destinations are mocked, but that code is not, so the
  // hints stay conservative: side effects possible, repeat calls not assumed
  // safe, external systems reachable.
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createFlowSimulateToolSpec(
  client: ToolClient,
  runtime: FlowRuntime,
): ToolSpec {
  return {
    name: 'flow_simulate',
    title: TITLE,
    description: FLOW_SIMULATE_DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowSimulateHandlerBody(client, runtime, input),
  };
}

async function flowSimulateHandlerBody(
  client: ToolClient,
  runtime: FlowRuntime,
  input: unknown,
) {
  const {
    configPath,
    event,
    flow,
    platform,
    step,
    verbose,
    ingest,
    state,
    command,
  } = (input ?? {}) as {
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
    command?: Flow.StepCommand;
  };
  // Simulation compiles the config and imports the bundle, running caller
  // controlled flow code. A runtime that must not do that in its process
  // provides no `simulate`, whatever the input looks like.
  if (!runtime.simulate) {
    const refusal = unavailableOperation('simulate');
    return mcpError(refusal, refusal.hint);
  }
  let known: string[] = [];
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

    if (!isStepType(stepType)) {
      throw new Error(
        `Unknown step type "${stepType}". Use "source", "collector", "transformer", or "destination".`,
      );
    }

    if (command !== undefined && stepType !== 'destination') {
      throw new Error('command applies to destination steps only.');
    }

    // Accept a cloud flow/config id as configPath, resolving it to inline JSON.
    const resolvedConfigPath = await resolveConfigPath(client, configPath);
    known = await knownSecretsOf(runtime, resolvedConfigPath);

    const result: Simulation.Result = await runtime.simulate(
      resolvedConfigPath,
      { stepType, stepId, event: resolvedEvent, flow, ingest, state, command },
    );

    const success = !result.error;
    const errorMessage = result.error?.message;

    // Source simulation: captured events are result.events
    if (result.step === 'source') {
      const eventCount = result.events.length;
      const summary = `Source captured ${eventCount} event${eventCount !== 1 ? 's' : ''}`;

      return mcpResult(
        scrubbed(
          {
            success,
            error: errorMessage,
            summary,
            capturedEvents: result.events,
            ...(verbose && result.calls.length > 0
              ? { calls: result.calls }
              : {}),
            duration: result.duration,
          },
          known,
        ),
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
        scrubbed(
          {
            success,
            error: errorMessage,
            summary: `Transformer processed event`,
            capturedEvents: result.events,
            duration: result.duration,
          },
          known,
        ),
        {
          next: ['Use flow_bundle to build for production'],
        },
      );
    }

    // Collector simulation: surface the enriched event
    if (result.step === 'collector') {
      return mcpResult(
        scrubbed(
          {
            success,
            error: errorMessage,
            summary: `Collector enriched event`,
            capturedEvents: result.events,
            duration: result.duration,
          },
          known,
        ),
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
    if (receivedCount === 0 && success) warnings.push(notReceived(result));

    const resultObj = {
      success,
      error: errorMessage,
      summary: `${receivedCount}/${destCount} destinations received the event`,
      destinations,
      ...(result.skipped ? { skipped: result.skipped } : {}),
      duration: result.duration,
    };

    return mcpResult(scrubbed(resultObj, known), {
      next: ['Use flow_bundle to build for production'],
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error) {
    const hint = 'Run flow_validate for detailed error messages';
    return scrubbedError(mcpError(error, refusalHint(error, hint)), known);
  }
}

/** The flow's secret values; none when the runtime cannot read the config. */
async function knownSecretsOf(
  runtime: FlowRuntime,
  input: string,
): Promise<string[]> {
  if (!runtime.knownSecrets) return [];
  try {
    return await runtime.knownSecrets(input);
  } catch {
    return [];
  }
}

function keysOf(consent: WalkerOS.Consent | undefined): string {
  const keys = Object.entries(consent ?? {})
    .filter(([, granted]) => granted)
    .map(([key]) => key);
  return keys.length > 0 ? keys.join(', ') : 'none';
}

/** Why a destination received nothing, from the result's own `skipped`. */
function notReceived(result: Simulation.Result): string {
  const { skipped } = result;
  if (skipped?.reason === 'pending') {
    const require = skipped.require ?? [];
    const waits = require.length ? require.join(', ') : 'its require';
    const advice = require.includes('consent')
      ? 'pass state.consent (e.g. { functional: true }) to start it.'
      : `it starts once the flow provides ${waits}; a simulation cannot seed that.`;
    return `Destination waits for ${waits} (require) and never started: ${advice}`;
  }
  if (skipped?.reason === 'consent') {
    return (
      `Consent skip: requires ${keysOf(skipped.required)}; granted ${keysOf(skipped.granted)}. ` +
      "Grant it in state.consent or in the event's consent."
    );
  }
  return (
    'Destination made no calls. Common causes: ' +
    '(1) mapping rules do not match the event name or ignore it, ' +
    '(2) policy redacted required fields, ' +
    '(3) a before chain stopped the event.'
  );
}

export function registerFlowSimulateTool(
  server: McpServer,
  client: ToolClient,
  runtime: FlowRuntime,
) {
  const spec = createFlowSimulateToolSpec(client, runtime);
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
