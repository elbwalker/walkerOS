import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import { redactDisplayNames } from '../user-data.js';
import { fieldsOf } from './narrow.js';
import { parseToolInput } from './parse-input.js';

const TITLE = 'Authentication';
const DESCRIPTION =
  'Manage walkerOS authentication. Check login status, log in via the device authorization grant, or log out. ' +
  'No terminal or browser required, the MCP client handles the authorization URL.';

/** A `'host'` door has no login of its own: the host checks every request. */
const HOST_LOGIN_MESSAGE =
  'This connection is already authenticated by the host; no login needed.';

/** Logging out of a `'host'` door is the host's job, so the tool says where. */
const HOST_LOGOUT_MESSAGE =
  'This connection is authorized by the host, so there is no session here to log out of. ' +
  'To end it, disconnect walkerOS in your MCP client, or revoke it in the walkerOS app under Account, Connected apps.';

/**
 * What a logout says when a credential is still there afterwards, by where it
 * comes from: a session stored while the revocation was in flight (a parallel
 * login or token refresh), or a `WALKEROS_TOKEN` the door did not clear.
 */
const STILL_AUTHENTICATED: Record<
  Exclude<ReturnType<ToolClient['credentialSource']>, null>,
  string
> = {
  config:
    'A newer session was stored while logging out and was kept. Call auth logout again to remove it.',
  env: 'WALKEROS_TOKEN is still set for this server process, so calls stay authenticated. Remove it from the MCP server configuration.',
  host: HOST_LOGOUT_MESSAGE,
};

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
  const parsed = parseToolInput(inputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { action, deviceCode } = parsed.data;
  try {
    switch (action) {
      case 'status': {
        if (!client.credentialSource()) {
          return mcpResult(
            { authenticated: false },
            { next: ['Use auth with action "login" to authenticate'] },
          );
        }
        // A hosted whoami lists the person's projects by name, and a name is
        // user-writable text, so every door's answer is wrapped.
        const user = await client.whoami();
        return mcpResult({
          authenticated: true,
          ...redactDisplayNames(fieldsOf(user)),
        });
      }

      case 'login': {
        if (client.credentialSource() === 'host') {
          return mcpResult(
            { authenticated: true, message: HOST_LOGIN_MESSAGE },
            {
              next: [
                'Use auth with action "status" to see which account you are on',
              ],
            },
          );
        }
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
        if (client.credentialSource() === 'host') {
          return mcpError(new Error(HOST_LOGOUT_MESSAGE));
        }
        const { deleted, envCleared } = await client.logout();
        // Never report a logout the credential survived: ask the door again
        // rather than trust what this logout removed.
        const remaining = client.credentialSource();
        if (remaining !== null) {
          return mcpResult({
            loggedOut: false,
            message: STILL_AUTHENTICATED[remaining],
          });
        }
        let message: string;
        if (deleted && envCleared) {
          message =
            'Logged out. Config removed and WALKEROS_TOKEN cleared from process environment.';
        } else if (deleted) {
          message = 'Logged out and config removed.';
        } else if (envCleared) {
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
    (args) => authHandlerBody(client, args),
  );
}
