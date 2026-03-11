import { push } from '@walkeros/cli';
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
        'WARNING: This makes real API calls to real endpoints. ' +
        'Note: Web destinations (gtag, meta, etc.) require browser globals that are not available in Node.js. ' +
        'For web flows, use flow_simulate to test. flow_push works best for server-side flows.',
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
        const result = await push(configPath, event, {
          json: true,
          flow,
          platform,
        });

        const r = result as Record<string, unknown>;
        const duration = r.duration as number | undefined;
        const summary = `Pushed event${duration ? ` (${duration}ms)` : ''}`;

        return mcpResult(result, summary);
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
