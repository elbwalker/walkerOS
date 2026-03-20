import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadJsonConfig } from '@walkeros/cli';
import { mcpResult, mcpError } from '@walkeros/core';

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

export function registerFlowLoadTool(server: McpServer) {
  server.registerTool(
    'flow_load',
    {
      title: 'Load or Create Flow',
      description:
        'Load an existing flow configuration from a local file path, URL, or walkerOS API (by flow ID). ' +
        'Or create a new empty flow by specifying a platform (web or server). ' +
        'Use the add-step prompt to add sources, destinations, transformers, or stores to the flow.',
      inputSchema: {
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
      },
      outputSchema: {
        version: z.number().describe('Flow config version'),
        flows: z.record(z.string(), z.unknown()).describe('Flow definitions'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ source, platform }) => {
      try {
        if (source) {
          const config = await loadJsonConfig(source);
          return mcpResult(
            config,
            `Loaded flow from ${source}. Use flow_validate to check, or add-step prompt to modify.`,
            {
              next: [
                'Use flow_validate to check',
                'Use add-step prompt to modify',
              ],
            },
          );
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
        return mcpResult(
          skeleton,
          `Created empty ${platform} flow. Use the add-step prompt to add sources, destinations, and transformers.`,
          {
            next: [
              'Read walkeros://reference/flow-schema for config structure',
              'Use add-step prompt to add sources and destinations',
            ],
          },
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('not found') || msg.includes('ENOENT'))
          return mcpError(
            error,
            'Check configPath — expected a flow.json file',
          );
        return mcpError(error);
      }
    },
  );
}
