import { z } from 'zod';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BundleOutputShape } from '../schemas/output.js';
import { structuredResult } from './helpers.js';

export function registerBundleTool(server: McpServer) {
  server.registerTool(
    'bundle',
    {
      title: 'Bundle',
      description:
        'Bundle a walkerOS flow configuration into deployable JavaScript. ' +
        'Resolves all destinations, sources, and transformers, then outputs ' +
        'a tree-shaken production bundle. Returns bundle statistics. ' +
        'Set remote: true to use the walkerOS cloud service instead of local build tools.',
      inputSchema: {
        ...schemas.BundleInputShape,
        remote: z
          .boolean()
          .optional()
          .describe(
            'Use remote cloud bundling (requires WALKEROS_TOKEN). Default: false (local)',
          ),
        content: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Flow.Setup JSON content (required when remote: true)'),
      },
      outputSchema: BundleOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, flow, stats, output, remote, content }) => {
      try {
        if (remote) {
          if (!content)
            throw new Error('content is required when remote: true');
          const { bundleRemote } = await import('@walkeros/cli');
          const result = await bundleRemote({
            content: content as Record<string, unknown>,
          });
          return structuredResult({ success: true, ...result });
        }

        // Local bundle path
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
