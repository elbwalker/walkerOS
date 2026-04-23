import { z } from 'zod';
import { bundle, bundleRemote } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { BundleOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';

const TITLE = 'Bundle Flow';
const DESCRIPTION =
  'Bundle a walkerOS flow configuration into deployable JavaScript. ' +
  'Resolves all destinations, sources, and transformers, then outputs ' +
  'a tree-shaken production bundle. Returns bundle statistics. ' +
  'Set remote: true to use the walkerOS cloud service instead of local build tools.';

const inputSchema = {
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
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createFlowBundleToolSpec(): ToolSpec {
  return {
    name: 'flow_bundle',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowBundleHandlerBody(input),
  };
}

async function flowBundleHandlerBody(input: unknown) {
  const { configPath, flow, stats, output, remote, content } = (input ??
    {}) as {
    configPath: string;
    flow?: string;
    stats?: boolean;
    output?: string;
    remote?: boolean;
    content?: Record<string, unknown>;
  };
  try {
    if (remote) {
      if (!content) throw new Error('content is required when remote: true');
      const result = await bundleRemote({
        content: content as Record<string, unknown>,
        flowName: flow,
      });
      return mcpResult(
        { success: true, ...result },
        {
          next: [
            'Use flow_simulate to test',
            'Use deploy_manage with action "deploy" to publish',
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
          'Use deploy_manage with action "deploy" to publish',
        ],
      },
    );
  } catch (error) {
    return mcpError(error, 'Run flow_validate for detailed error messages');
  }
}

export function registerFlowBundleTool(server: McpServer) {
  const spec = createFlowBundleToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // outputSchema is wire-only; not part of ToolSpec
      outputSchema: BundleOutputShape,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
