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
        'Events must be in walkerOS event format (post-source output): { name: "entity action", data: {...} }. ' +
        'Use package_get on your source to check its output shape. ' +
        'Use the example parameter to load event input from a step example and compare output.',
      inputSchema: {
        ...schemas.SimulateInputShape,
        verbose: z
          .boolean()
          .optional()
          .describe(
            'Include full payload per destination (default: false, concise summary only)',
          ),
      },
      outputSchema: SimulateOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, event, flow, platform, example, step, verbose }) => {
      try {
        if (!event && !example) {
          throw new Error('Either event or example must be provided');
        }

        const raw: SimulationResult = await simulate(configPath, event, {
          json: true,
          flow,
          platform,
          example,
          step,
        });

        // Summarize per-destination (keep it concise for AI consumers)
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
          warnings.push(
            'No destinations found in flow configuration. Check that your flow defines at least one destination.',
          );
        }
        if (destCount > 0 && receivedCount === 0) {
          warnings.push(
            'No destinations received the event. Check: mapping keys use nested entity→action structure (not dot-separated), event name matches, consent is granted. Use package_get on the destination for mapping examples.',
          );
        }

        const summary = `${receivedCount}/${destCount} destinations received the event`;

        const result = {
          success: raw.success,
          error: raw.error,
          summary,
          destinations: destCount > 0 ? destinations : undefined,
          exampleMatch: raw.exampleMatch,
          duration: raw.duration,
        };

        return mcpResult(result, summary, {
          next: ['Use flow_bundle to build for production'],
          ...(warnings.length > 0 ? { warnings } : {}),
        });
      } catch (error) {
        return mcpError(error, 'Run flow_validate for detailed error messages');
      }
    },
  );
}
