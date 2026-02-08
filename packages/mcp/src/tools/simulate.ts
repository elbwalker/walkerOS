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
        'returning detailed results with logs and usage statistics.',
      inputSchema: schemas.SimulateInputShape,
      outputSchema: SimulateOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, event, flow, platform }) => {
      try {
        const { simulate } = await import('@walkeros/cli');

        // Parse event if JSON string
        let parsedEvent: unknown = event;
        if (event.startsWith('{') || event.startsWith('[')) {
          try {
            parsedEvent = JSON.parse(event);
          } catch {
            // Keep as string (file path or URL)
          }
        }

        const result = await simulate(configPath, parsedEvent, {
          json: true,
          flow,
          platform,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result as Record<string, unknown>,
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
