import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerBundleTool(server: McpServer) {
  server.registerTool(
    'bundle',
    {
      description:
        'Bundle a walkerOS flow configuration into deployable JavaScript',
      inputSchema: {
        configPath: z
          .string()
          .min(1)
          .describe('Path to flow configuration file (JSON or JavaScript)'),
        flow: z
          .string()
          .optional()
          .describe('Flow name for multi-flow configs'),
        stats: z
          .boolean()
          .optional()
          .default(true)
          .describe('Return bundle statistics'),
        output: z
          .string()
          .optional()
          .describe('Output file path (defaults to config-defined)'),
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
