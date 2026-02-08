import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PushOutputShape } from '../schemas/output.js';

export function registerPushTool(server: McpServer) {
  server.registerTool(
    'push',
    {
      title: 'Push',
      description:
        'Push a real event through a walkerOS flow to actual destinations. ' +
        'WARNING: This makes real API calls to real endpoints. ' +
        'Events will be sent to configured destinations (analytics, CRM, etc.).',
      inputSchema: schemas.PushInputShape,
      outputSchema: PushOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ configPath, event, flow, platform }) => {
      try {
        const { push } = await import('@walkeros/cli');

        // Parse event if JSON string
        let parsedEvent: unknown = event;
        if (event.startsWith('{') || event.startsWith('[')) {
          try {
            parsedEvent = JSON.parse(event);
          } catch {
            // Keep as string (file path or URL)
          }
        }

        const result = await push(configPath, parsedEvent, {
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
