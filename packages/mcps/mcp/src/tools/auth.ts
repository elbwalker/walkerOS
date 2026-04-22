import { z } from 'zod';
import {
  resolveToken,
  deleteConfig,
  requestDeviceCode,
  pollForToken,
  whoami,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';

export function registerAuthTool(server: McpServer) {
  server.registerTool(
    'auth',
    {
      title: 'Authentication',
      description:
        'Manage walkerOS authentication. Check login status, log in via device code flow, or log out. ' +
        'No terminal or browser required — the MCP client handles the authorization URL.',
      inputSchema: {
        action: z
          .enum(['status', 'login', 'logout'])
          .describe('Authentication action to perform'),
        deviceCode: z
          .string()
          .optional()
          .describe(
            'Device code from a previous pending login attempt. Provide to resume polling without requesting a new code.',
          ),
      },
      // No outputSchema: action-dispatched tool — each action returns a different shape
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ action, deviceCode }) => {
      try {
        switch (action) {
          case 'status': {
            const resolved = resolveToken();
            if (!resolved) {
              return mcpResult(
                { authenticated: false },
                { next: ['Use auth with action "login" to authenticate'] },
              );
            }
            const user = await whoami();
            return mcpResult({ authenticated: true, ...user });
          }

          case 'login': {
            // Retry path: caller already has a deviceCode from a previous pending attempt
            if (deviceCode) {
              const pollResult = await pollForToken(deviceCode, {
                timeoutMs: 60000,
              });

              if (pollResult.success) {
                return mcpResult(
                  { authenticated: true, email: pollResult.email },
                  {
                    next: [
                      'Use project_manage with action "list" to see your projects',
                    ],
                  },
                );
              }

              if (pollResult.status === 'pending') {
                return mcpResult({
                  authenticated: false,
                  status: 'pending',
                  message:
                    'Still waiting for authorization. Try again shortly.',
                  deviceCode,
                });
              }

              // pollResult is narrowed to { status: 'error', error: string }
              return mcpError(
                new Error(pollResult.error || 'Authorization failed'),
              );
            }

            // Fresh login: return URL immediately, do NOT poll
            // The user needs to see and open the URL first
            const code = await requestDeviceCode();
            const loginUrl =
              code.verificationUriComplete || code.verificationUri;

            return mcpResult({
              authenticated: false,
              status: 'awaiting_authorization',
              loginUrl,
              message: `Open this link to authorize: ${loginUrl}`,
              deviceCode: code.deviceCode,
            });
          }

          case 'logout': {
            const deleted = deleteConfig();
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
              message = 'No config found — already logged out.';
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
    },
  );
}
