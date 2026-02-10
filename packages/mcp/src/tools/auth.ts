import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest } from '@walkeros/cli';

export function registerAuthTools(server: McpServer) {
  server.registerTool(
    'whoami',
    {
      title: 'Who Am I',
      description:
        'Verify your API token and see your identity. ' +
        'Returns user ID, email, and project ID (if token is project-scoped). ' +
        'Use this to confirm your token works and discover your project ID.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const result = await apiRequest('/api/auth/whoami');
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
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
