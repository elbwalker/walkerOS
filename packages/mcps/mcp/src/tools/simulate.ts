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
  errors: string[];
}

export function registerFlowSimulateTool(server: McpServer) {
  server.registerTool(
    'flow_simulate',
    {
      title: 'Simulate Flow',
      description:
        'Simulate events through a walkerOS flow without making real API calls. ' +
        'Processes events through the full pipeline including transformers and destinations, ' +
        'returning summarized per-destination results. ' +
        'Use the example parameter to load event input from a step example and compare output.',
      inputSchema: schemas.SimulateInputShape,
      outputSchema: SimulateOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, event, flow, platform, example, step }) => {
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

        // Summarize per-destination
        const destinations: Record<string, DestinationSummary> = {};

        if (raw.usage) {
          for (const [name, calls] of Object.entries(raw.usage)) {
            destinations[name] = {
              received: calls.length > 0,
              calls: calls.length,
              payload: calls.length > 0 ? calls[calls.length - 1] : undefined,
              errors: [],
            };
          }
        }

        const destCount = Object.keys(destinations).length;
        const receivedCount = Object.values(destinations).filter(
          (d) => d.received,
        ).length;

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
        });
      } catch (error) {
        return mcpError(error, 'Run flow_validate for detailed error messages');
      }
    },
  );
}
