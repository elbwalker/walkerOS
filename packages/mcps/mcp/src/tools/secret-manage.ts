import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  validateActionInput,
  assertParam,
  SECRET_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';
import {
  NO_DEFAULT_PROJECT_ERROR,
  resolveDefaultProject,
} from './project-context.js';

const TITLE = 'Secret Management';
const DESCRIPTION =
  'Manage a flow’s managed secrets (the $secret.<NAME> values its steps reference at deploy/run time). ' +
  'Actions: list (metadata only), set (create), update (rotate value), delete. ' +
  'Secrets are write-mostly: values are encrypted at rest and are NEVER returned, listed, or echoed. ' +
  'Reference a secret from a flow step as $secret.<NAME>. Credentials, tokens, and private keys must use $secret, not $env: ' +
  'the deploy pipeline only injects values referenced as $secret.<NAME> into the server runner. Server flows only.';

const inputSchema = {
  action: z
    .enum(['list', 'set', 'update', 'delete'])
    .describe('Secret management action to perform'),
  projectId: z
    .string()
    .optional()
    .describe(
      'Project ID. Optional: falls back to the default project when omitted.',
    ),
  flowId: z
    .string()
    .describe(
      'Flow ID (flow_...) or config ID (cfg_...). Required for list, set, update, and delete: secrets are flow-scoped.',
    ),
  name: z
    .string()
    .regex(
      /^[A-Z_][A-Z0-9_]*$/,
      'Secret name must be uppercase letters, digits, and underscores, starting with a letter or underscore.',
    )
    .optional()
    .describe(
      'Secret name (UPPER_SNAKE_CASE). Required for set. Referenced in flows as $secret.<NAME>.',
    ),
  value: z
    .string()
    .min(1)
    .max(65536)
    .optional()
    .describe(
      'Secret value (1-65536 chars). Required for set and update. Write-only: never returned or logged.',
    ),
  secretId: z
    .string()
    .optional()
    .describe(
      'Secret ID (sec_...). Required for update and delete. Use action "list" to find it.',
    ),
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createSecretManageToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'secret_manage',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => secretManageHandlerBody(client, input),
  };
}

async function secretManageHandlerBody(client: ToolClient, input: unknown) {
  const { action, projectId, flowId, name, value, secretId } = (input ??
    {}) as {
    action?: 'list' | 'set' | 'update' | 'delete';
    projectId?: string;
    flowId?: string;
    name?: string;
    value?: string;
    secretId?: string;
  };
  const validationError = validateActionInput(
    'secret_manage',
    action ?? '',
    { flowId, name, value, secretId },
    SECRET_MANAGE_REQUIREMENTS,
  );
  if (validationError) return mcpError(new Error(validationError));
  try {
    const resolvedProjectId = resolveDefaultProject(client, projectId);
    if (!resolvedProjectId)
      return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));

    switch (action) {
      case 'list': {
        assertParam(flowId, 'flowId', 'list');
        const data = await client.listSecrets({
          projectId: resolvedProjectId,
          flowId,
        });
        return mcpResult(data as Record<string, unknown>, {
          next: [
            'Reference a listed secret from a flow step as $secret.<NAME>.',
            'Use action "set" to add a secret or "update" to rotate one.',
          ],
        });
      }

      case 'set': {
        assertParam(flowId, 'flowId', 'set');
        assertParam(name, 'name', 'set');
        assertParam(value, 'value', 'set');
        const created = await client.createSecret({
          projectId: resolvedProjectId,
          flowId,
          name,
          value,
        });
        // Response is metadata only; value is never echoed back.
        return mcpResult(created as Record<string, unknown>, {
          next: [`Reference it in this flow as $secret.${name}.`],
        });
      }

      case 'update': {
        assertParam(flowId, 'flowId', 'update');
        assertParam(secretId, 'secretId', 'update');
        assertParam(value, 'value', 'update');
        const updated = await client.updateSecret({
          projectId: resolvedProjectId,
          flowId,
          secretId,
          value,
        });
        return mcpResult(updated as Record<string, unknown>);
      }

      case 'delete': {
        assertParam(flowId, 'flowId', 'delete');
        assertParam(secretId, 'secretId', 'delete');
        const deleted = await client.deleteSecret({
          projectId: resolvedProjectId,
          flowId,
          secretId,
        });
        return mcpResult(
          deleted && typeof deleted === 'object'
            ? (deleted as Record<string, unknown>)
            : { deleted: true, secretId },
        );
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use one of: list, set, update, delete`,
        );
    }
  } catch (error) {
    return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
  }
}

export function registerSecretManageTool(
  server: McpServer,
  client: ToolClient,
) {
  const spec = createSecretManageToolSpec(client);
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
