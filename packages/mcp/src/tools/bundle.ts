import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerBundleTool(server: McpServer) {
  server.registerTool(
    'bundle',
    {
      title: 'Bundle',
      description:
        'Bundle a walkerOS flow configuration into deployable JavaScript. ' +
        'Resolves all destinations, sources, and transformers, then outputs ' +
        'a tree-shaken production bundle. Returns bundle statistics.',
      inputSchema: schemas.BundleInputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, flow, stats, output }) => {
      try {
        // Dynamic import to handle peer dependency
        const { bundle } = await import('@walkeros/cli');

        const result = await bundle(configPath, {
          flowName: flow,
          stats: stats ?? true,
          buildOverrides: output ? { output } : undefined,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                result ?? { success: true, message: 'Bundle created' },
                null,
                2,
              ),
            },
          ],
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
