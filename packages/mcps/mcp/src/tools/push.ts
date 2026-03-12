import { push } from '@walkeros/cli';
import type { PushResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { PushOutputShape } from '../schemas/output.js';

export function registerFlowPushTool(server: McpServer) {
  server.registerTool(
    'flow_push',
    {
      title: 'Push Events',
      description:
        'Push a real event through a walkerOS flow to actual destinations. ' +
        'Makes real API calls to real endpoints. ' +
        'Best suited for server-side flows — web flows should use flow_simulate for testing.',
      inputSchema: schemas.PushInputShape,
      outputSchema: PushOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ configPath, event, flow, platform }) => {
      try {
        const result: PushResult = await push(configPath, event, {
          json: true,
          flow,
          platform,
        });

        if (!result.success) {
          return mcpError(
            new Error(result.error || 'Push failed'),
            'Check destination configuration and connectivity.',
          );
        }

        const summary = `Pushed event${result.duration ? ` (${result.duration}ms)` : ''}`;

        return mcpResult(result, summary);
      } catch (error) {
        return mcpError(
          error,
          'Check configPath and event format. For web flows, use flow_simulate.',
        );
      }
    },
  );
}
