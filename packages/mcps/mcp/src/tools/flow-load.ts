import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadJsonConfig } from '@walkeros/cli';
import { mcpResult, mcpError } from '@walkeros/core';

import type { ToolSpec } from '../tool-spec.js';

const WEB_SKELETON = {
  version: 3,
  flows: {
    default: {
      web: {},
      packages: {},
      sources: {},
      destinations: {},
    },
  },
};

const SERVER_SKELETON = {
  version: 3,
  flows: {
    default: {
      server: {},
      packages: {},
      sources: {},
      destinations: {},
    },
  },
};

const TITLE = 'Load or Create Flow';
const DESCRIPTION =
  'Load an existing flow configuration from a local file path, URL, or walkerOS API (by flow ID). ' +
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
  flows: z.record(z.string(), z.unknown()).describe('Flow definitions'),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function createFlowLoadToolSpec(): ToolSpec {
  return {
    name: 'flow_load',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowLoadHandlerBody(input),
  };
}

async function flowLoadHandlerBody(input: unknown) {
  const { source, platform } = (input ?? {}) as {
    source?: string;
    platform?: 'web' | 'server';
  };
  try {
    if (source) {
      const config = await loadJsonConfig(source);
      return mcpResult(config, {
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
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('not found') || msg.includes('ENOENT'))
      return mcpError(error, 'Check configPath — expected a flow.json file');
    return mcpError(error);
  }
}

export function registerFlowLoadTool(server: McpServer) {
  const spec = createFlowLoadToolSpec();
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
