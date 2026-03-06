import { simulate } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SimulateOutputShape } from '../schemas/output.js';

export function registerSimulateTool(server: McpServer) {
  server.registerTool(
    'simulate',
    {
      title: 'Simulate',
      description:
        'Simulate events through a walkerOS flow without making real API calls. ' +
        'Processes events through the full pipeline including transformers and destinations, ' +
        'returning detailed results with logs and usage statistics. ' +
        'Use --example to load event input from a step example and compare output.',
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
        // When example is provided, event is optional
        if (!event && !example) {
          throw new Error('Either event or example must be provided');
        }

        const result = await simulate(configPath, event, {
          json: true,
          flow,
          platform,
          example,
          step,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
