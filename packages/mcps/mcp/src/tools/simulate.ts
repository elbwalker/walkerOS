import { z } from 'zod';
import { simulate } from '@walkeros/cli';
import type { SimulationResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { SimulateOutputShape } from '../schemas/output.js';

interface DestinationSummary {
  received: boolean;
  calls: number;
  payload?: unknown;
}

export function registerFlowSimulateTool(server: McpServer) {
  server.registerTool(
    'flow_simulate',
    {
      title: 'Simulate Flow',
      description:
        'Simulate events through a walkerOS flow without making real API calls. ' +
        'For destinations: event is a walkerOS event { name: "entity action", data: {...} }. ' +
        'For sources: event is { content: ..., trigger?: { type?, options? }, env?: {...} }. ' +
        'Use step to target a specific step. ' +
        'Use flow_examples to discover available test data.',
      inputSchema: {
        configPath: schemas.SimulateInputShape.configPath,
        event: z
          .union([z.record(z.string(), z.unknown()), z.string()])
          .optional()
          .describe(
            'For destinations: { name, data }. For sources: { content, trigger?, env? }. ' +
              'Can also be a JSON string or file path.',
          ),
        flow: schemas.SimulateInputShape.flow,
        platform: schemas.SimulateInputShape.platform,
        step: schemas.SimulateInputShape.step,
        verbose: z
          .boolean()
          .optional()
          .describe('Include full payload per destination (default: false)'),
      },
      outputSchema: SimulateOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, event, flow, platform, step, verbose }) => {
      try {
        if (!event) {
          throw new Error(
            'event is required. For sources provide { content, trigger? }, for destinations provide { name, data }.',
          );
        }

        const raw: SimulationResult = await simulate(configPath, event, {
          json: true,
          flow,
          platform,
          step,
        });

        // Source simulation returns capturedEvents
        if (raw.capturedEvents) {
          const eventCount = raw.capturedEvents.length;
          const summary = `Source captured ${eventCount} event${eventCount !== 1 ? 's' : ''}`;

          return mcpResult(
            {
              success: raw.success,
              error: raw.error,
              summary,
              capturedEvents: raw.capturedEvents,
              duration: raw.duration,
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

        if (raw.usage) {
          for (const [name, calls] of Object.entries(raw.usage)) {
            const summary: DestinationSummary = {
              received: calls.length > 0,
              calls: calls.length,
            };
            if (verbose && calls.length > 0) {
              summary.payload = calls[calls.length - 1];
            }
            destinations[name] = summary;
          }
        }

        const destCount = Object.keys(destinations).length;
        const receivedCount = Object.values(destinations).filter(
          (d) => d.received,
        ).length;

        const warnings: string[] = [];
        if (destCount === 0) {
          warnings.push('No destinations found in flow configuration.');
        }
        if (destCount > 0 && receivedCount === 0) {
          warnings.push(
            'No destinations received the event. Check: mapping keys use nested entity→action structure, event name matches, consent is granted.',
          );
        }

        const summary = `${receivedCount}/${destCount} destinations received the event`;

        const result = {
          success: raw.success,
          error: raw.error,
          summary,
          destinations: destCount > 0 ? destinations : undefined,
          duration: raw.duration,
        };

        return mcpResult(result, {
          next: ['Use flow_bundle to build for production'],
          ...(warnings.length > 0 ? { warnings } : {}),
        });
      } catch (error) {
        return mcpError(error, 'Run flow_validate for detailed error messages');
      }
    },
  );
}
