import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { BundleOutputShape } from '../schemas/output.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import { parseToolInput } from './parse-input.js';
import { resolveConfigPath } from './resolve-config-path.js';
import {
  refusalHint,
  unavailableOperation,
  type FlowRuntime,
} from '../runtime/types.js';

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

export function createFlowBundleToolSpec(
  client: ToolClient,
  runtime: FlowRuntime,
): ToolSpec {
  return {
    name: 'flow_bundle',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowBundleHandlerBody(client, runtime, input),
  };
}

async function flowBundleHandlerBody(
  client: ToolClient,
  runtime: FlowRuntime,
  input: unknown,
) {
  const parsed = parseToolInput(inputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { configPath, flow, stats, output } = parsed.data;
  // Bundling compiles the config and resolves every package it names. A
  // runtime that must not do that in its process provides no `bundle`.
  if (!runtime.bundle) {
    const refusal = unavailableOperation('bundle');
    return mcpError(refusal, refusal.hint);
  }
  try {
    // Accept a cloud flow/config id as configPath, resolving it to inline JSON.
    const resolvedConfigPath = await resolveConfigPath(client, configPath);
    const result = await runtime.bundle(resolvedConfigPath, {
      flowName: flow,
      stats: stats ?? true,
      output,
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

    return mcpResult(
      { success: true, ...result },
      {
        next: [
          'Use flow_simulate to test',
          'Use deploy_manage with action "deploy" to publish',
        ],
      },
    );
  } catch (error) {
    return mcpError(
      error,
      refusalHint(error, 'Run flow_validate for detailed error messages'),
    );
  }
}

export function registerFlowBundleTool(
  server: McpServer,
  client: ToolClient,
  runtime: FlowRuntime,
) {
  const spec = createFlowBundleToolSpec(client, runtime);
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
    (args) => flowBundleHandlerBody(client, runtime, args),
  );
}
