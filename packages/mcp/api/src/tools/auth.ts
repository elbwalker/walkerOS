import { whoami } from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
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
        return mcpResult(await whoami());
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
