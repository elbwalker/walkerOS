import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { bundleRemote } from '@walkeros/cli';

export function registerBundleRemoteTool(server: McpServer) {
  server.registerTool(
    'bundle-remote',
    {
      title: 'Bundle Remote',
      description:
        'Bundle a flow configuration into deployable JavaScript using the walkerOS cloud service. ' +
        'Sends config JSON and receives a compiled .mjs bundle. No local build tools needed.',
      inputSchema: {
        content: z
          .record(z.string(), z.unknown())
          .describe('Flow.Setup JSON content (must have version: 1)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ content }) => {
      try {
        const result = await bundleRemote({
          content: content as Record<string, unknown>,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, ...result }, null, 2),
            },
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
