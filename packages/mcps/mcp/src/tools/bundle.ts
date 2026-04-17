import { z } from 'zod';
import { bundle, bundleRemote } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { BundleOutputShape } from '../schemas/output.js';

export function registerFlowBundleTool(server: McpServer) {
  server.registerTool(
    'flow_bundle',
    {
      title: 'Bundle Flow',
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
            'Use remote cloud bundling (requires authentication). Default: false (local)',
          ),
        content: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Flow.Config JSON content (required when remote: true)'),
      },
      outputSchema: BundleOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ configPath, flow, stats, output, remote, content }) => {
      try {
        if (remote) {
          if (!content)
            throw new Error('content is required when remote: true');
          const result = await bundleRemote({
            content: content as Record<string, unknown>,
            flowName: flow,
          });
          return mcpResult(
            { success: true, ...result },
            {
              next: [
                'Use flow_simulate to test',
                'Use deploy with action "deploy" to publish',
              ],
            },
          );
        }

        const result = await bundle(configPath, {
          flowName: flow,
          stats: stats ?? true,
          buildOverrides: output ? { output } : undefined,
        });

        if (!result) {
          return mcpResult(
            { success: false, message: 'Bundle produced no output' },
            {
              warnings: [
                'The build returned no result. The flow may be empty or misconfigured.',
              ],
              next: ['Run flow_validate to check your configuration'],
            },
          );
        }

        const output_ = result as unknown as Record<string, unknown>;

        return mcpResult(
          { success: true, ...output_ },
          {
            next: [
              'Use flow_simulate to test',
              'Use deploy with action "deploy" to publish',
            ],
          },
        );
      } catch (error) {
        return mcpError(error, 'Run flow_validate for detailed error messages');
      }
    },
  );
}
