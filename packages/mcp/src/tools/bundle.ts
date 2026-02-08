import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BundleOutputShape } from '../schemas/output.js';

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
      outputSchema: BundleOutputShape,
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

        const output_ = (result as unknown as Record<string, unknown>) ?? {
          success: true,
          message: 'Bundle created',
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(output_, null, 2),
            },
          ],
          structuredContent: output_,
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
