import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiResult, apiError } from './helpers.js';
import { WhoamiOutputShape } from '../schemas/output.js';

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
      outputSchema: WhoamiOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const { whoami } = await import('@walkeros/cli');
        return apiResult(await whoami());
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
