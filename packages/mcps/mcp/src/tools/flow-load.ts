import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import { redactNestedStrings, keepStructural } from '../user-data.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  NO_DEFAULT_PROJECT_ERROR,
  resolveDefaultProject,
} from './project-context.js';
import { RuntimeRefusal, type FlowRuntime } from '../runtime/types.js';

import { flowConfigOf, isCloudId } from '../cloud-flow.js';

const WEB_SKELETON = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'web', bundle: { packages: {} } },
      sources: {},
      destinations: {},
    },
  },
};

const SERVER_SKELETON = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'server', bundle: { packages: {} } },
      sources: {},
      destinations: {},
    },
  },
};

const TITLE = 'Load or Create Flow';
const DESCRIPTION =
  'Load an existing flow configuration from a local file path, URL, or walkerOS API (by flow ID). ' +
  'On the hosted server only inline JSON or a saved flow id is accepted, no file paths or URLs. ' +
  'Or create a new empty flow by specifying a platform (web or server). ' +
  'Use the add-step prompt to add sources, destinations, transformers, or stores to the flow.';

const inputSchema = {
  source: z
    .string()
    .optional()
    .describe(
      'Flow source: local file path (./flow.json), URL (https://...), ' +
        'inline JSON string, or API flow ID (cfg_...). Omit to create a new flow.',
    ),
  platform: z
    .enum(['web', 'server'])
    .optional()
    .describe(
      'Platform for new flows. Required when source is omitted. ' +
        'web = browser tracking, server = Node.js HTTP.',
    ),
};

const outputSchema = {
  version: z.number().describe('Flow config version'),
  flows: z.record(z.string(), z.unknown()).describe('Flow entries'),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function createFlowLoadToolSpec(
  client: ToolClient,
  runtime: FlowRuntime,
): ToolSpec {
  return {
    name: 'flow_load',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowLoadHandlerBody(client, runtime, input),
  };
}

async function flowLoadHandlerBody(
  client: ToolClient,
  runtime: FlowRuntime,
  input: unknown,
) {
  const { source, platform } = (input ?? {}) as {
    source?: string;
    platform?: 'web' | 'server';
  };

  // Load by cloud flow/config id (flow_… / cfg_…) via the same client seam
  // flow_manage `get` uses. Its NOT_FOUND surfaces directly, never remapped
  // to the local "file not found" hint below.
  if (source && isCloudId(source)) {
    const resolvedProjectId = resolveDefaultProject(client, undefined);
    if (!resolvedProjectId) {
      return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));
    }
    try {
      const flow = await client.getFlow({
        flowId: source,
        projectId: resolvedProjectId,
      });
      return mcpResult(
        redactNestedStrings(flowConfigOf(flow), { skip: keepStructural }),
        {
          next: ['Use flow_validate to check', 'Use add-step prompt to modify'],
        },
      );
    } catch (error) {
      return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
    }
  }

  try {
    if (source) {
      // Every file or URL read goes through the runtime, which decides what
      // this process may load.
      const config = await runtime.load(source);
      return mcpResult(redactNestedStrings(config, { skip: keepStructural }), {
        next: ['Use flow_validate to check', 'Use add-step prompt to modify'],
      });
    }

    if (!platform) {
      return mcpError(
        new Error(
          'Provide source (file path, URL, or flow ID) to load existing flow, ' +
            'or platform (web/server) to create a new one.',
        ),
      );
    }

    const skeleton = platform === 'web' ? WEB_SKELETON : SERVER_SKELETON;
    return mcpResult(skeleton, {
      next: [
        'Read walkeros://reference/flow-schema for config structure',
        'Use add-step prompt to add sources and destinations',
      ],
    });
  } catch (error) {
    if (error instanceof RuntimeRefusal) return mcpError(error, error.hint);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('not found') || msg.includes('ENOENT'))
      return mcpError(error, 'Check configPath — expected a flow.json file');
    return mcpError(error);
  }
}

export function registerFlowLoadTool(
  server: McpServer,
  client: ToolClient,
  runtime: FlowRuntime,
) {
  const spec = createFlowLoadToolSpec(client, runtime);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // outputSchema is wire-only; not part of ToolSpec
      outputSchema,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
