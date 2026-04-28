import { bundle } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { BundleOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';

const TITLE = 'Bundle Flow';
const DESCRIPTION =
  'Bundle a walkerOS flow configuration into deployable JavaScript. ' +
  'Resolves all destinations, sources, and transformers, then outputs ' +
  'a tree-shaken production bundle. Returns bundle statistics.';

const inputSchema = {
  ...schemas.BundleInputShape,
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
  const { configPath, flow, stats, output } = (input ?? {}) as {
    configPath: string;
    flow?: string;
    stats?: boolean;
    output?: string;
  };
  try {
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
