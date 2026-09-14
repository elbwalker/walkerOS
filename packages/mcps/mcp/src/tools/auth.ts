import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';

const TITLE = 'Authentication';
const DESCRIPTION =
  'Manage walkerOS authentication. Check login status, log in via the device authorization grant, or log out. ' +
  'No terminal or browser required, the MCP client handles the authorization URL.';

const inputSchema = {
  action: z
    .enum(['status', 'login', 'logout'])
    .describe('Authentication action to perform'),
  deviceCode: z
    .string()
    .optional()
    .describe(
      'Device code from a previous pending login attempt. Provide to resume polling without requesting a new code.',
    ),
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createAuthToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'auth',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => authHandlerBody(client, input),
  };
}

async function authHandlerBody(client: ToolClient, input: unknown) {
  const { action, deviceCode } = (input ?? {}) as {
    action?: 'status' | 'login' | 'logout';
    deviceCode?: string;
  };
  try {
    switch (action) {
      case 'status': {
        if (!client.credentialSource()) {
          return mcpResult(
            { authenticated: false },
            { next: ['Use auth with action "login" to authenticate'] },
          );
        }
        const user = await client.whoami();
        return mcpResult({
          authenticated: true,
          ...(user as Record<string, unknown>),
        });
      }

      case 'login': {
        if (deviceCode) {
          const poll = await client.pollForToken(deviceCode, {
            timeoutMs: 60000,
          });

          if (poll.status === 'ok') {
            return mcpResult(
              { authenticated: true },
              {
                next: [
                  'Use auth with action "status" to see which account you are on',
                  'Use project_manage with action "list" to see your projects',
                ],
              },
            );
          }

          // The approval is still outstanding, so the code is still good and
          // the same one comes back for the next attempt. `slow_down` is the
          // server asking for a wider gap before that attempt.
          if (poll.status === 'pending' || poll.status === 'slow_down') {
            return mcpResult({
              authenticated: false,
              status: 'pending',
              message:
                poll.status === 'slow_down'
                  ? 'Still waiting, and the server asked for a longer gap between checks. Try again in a minute.'
                  : 'Still waiting for authorization. Try again shortly.',
              deviceCode,
            });
          }

          if (poll.status === 'denied')
            return mcpError(new Error('Authorization was denied.'));
          if (poll.status === 'expired')
            return mcpError(
              new Error(
                'The one-time code expired. Run auth with action "login" for a new one.',
              ),
            );

          return mcpError(new Error(poll.error));
        }

        const code = await client.requestDeviceCode();
        const loginUrl = code.verificationUriComplete;

        return mcpResult({
          authenticated: false,
          status: 'awaiting_authorization',
          loginUrl,
          message: `Open this link to authorize: ${loginUrl}`,
          deviceCode: code.deviceCode,
        });
      }

      case 'logout': {
        const { deleted } = await client.logout();
        const hadEnvToken =
          typeof process.env.WALKEROS_TOKEN === 'string' &&
          process.env.WALKEROS_TOKEN.length > 0;
        delete process.env.WALKEROS_TOKEN;
        let message: string;
        if (deleted && hadEnvToken) {
          message =
            'Logged out. Config removed and WALKEROS_TOKEN cleared from process environment.';
        } else if (deleted) {
          message = 'Logged out and config removed.';
        } else if (hadEnvToken) {
          message =
            'No config found. WALKEROS_TOKEN cleared from process environment.';
        } else {
          message = 'No config found, already logged out.';
        }
        return mcpResult({
          loggedOut: true,
          message,
        });
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use one of: status, login, logout`,
        );
    }
  } catch (error) {
    return mcpError(error);
  }
}

export function registerAuthTool(server: McpServer, client: ToolClient) {
  const spec = createAuthToolSpec(client);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
