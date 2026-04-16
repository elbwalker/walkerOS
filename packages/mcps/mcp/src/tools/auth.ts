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
                      'Use api with action "project.list" to see your projects',
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

              return mcpError(new Error(pollResult.error));
            }

            // Fresh login: request a new device code, then poll
            const code = await requestDeviceCode();
            const loginUrl =
              code.verificationUriComplete || code.verificationUri;

            const result = await pollForToken(code.deviceCode, {
              timeoutMs: 60000,
            });

            if (result.success) {
              return mcpResult(
                { authenticated: true, email: result.email, loginUrl },
                {
                  next: [
                    'Use api with action "project.list" to see your projects',
                  ],
                },
              );
            }

            if (result.status === 'pending') {
              return mcpResult({
                authenticated: false,
                status: 'pending',
                loginUrl,
                message: `Open this link to authorize: ${loginUrl}`,
                deviceCode: code.deviceCode,
              });
            }

            return mcpError(new Error(result.error));
          }

          case 'logout': {
            const deleted = deleteConfig();
            return mcpResult({
              loggedOut: true,
              message: deleted
                ? 'Logged out and config removed'
                : 'No config found — already logged out',
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
