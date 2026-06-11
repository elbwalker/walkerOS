import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import { redactDisplayNames } from '../user-data.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  resolveDeploymentSlug,
  type DeploymentSummaryForResolver,
  type ListDeploymentsForResolver,
} from './_resolvers.js';
import {
  validateActionInput,
  assertParam,
  DEPLOY_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';

const TITLE = 'Deploy Management';
const DESCRIPTION =
  'Deploy walkerOS flows and manage deployments. ' +
  'deploy waits for the deployment to reach a terminal status by default (wait=true), with a 12-minute budget; pass wait=false to return immediately with the deployment id. ' +
  'A finished deployment carries its status and, on failure, an errorMessage with the user-facing reason; use the get action to re-read it. ' +
  'list supports cursor and limit for pagination. ' +
  'delete removes an active deployment. ' +
  'For get and delete pass flowId (required) plus optional slug to disambiguate when a flow has multiple active deployments. ' +
  "If a flow has >=2 active deployments and no slug is supplied, the tool returns a MULTIPLE_DEPLOYMENTS error with a details[] list showing each deployment's slug, type, status, and updatedAt.";

const inputSchema = {
  action: z
    .enum(['deploy', 'list', 'get', 'delete'])
    .describe('Deployment action to perform'),
  projectId: z
    .string()
    .optional()
    .describe('Project ID. Optional; falls back to the default project.'),
  flowId: z.string().optional().describe('Required for deploy, get, delete.'),
  slug: z
    .string()
    .optional()
    .describe(
      'Deployment slug. Optional disambiguator for get/delete when the flow has multiple active deployments.',
    ),
  type: z
    .enum(['web', 'server'])
    .optional()
    .describe('Deployment type filter for list.'),
  status: z.string().optional().describe('Status filter for list.'),
  wait: z
    .boolean()
    .optional()
    .describe(
      'Wait for the deployment to reach a terminal status (default true), with a 12-minute budget. Set false to return the deployment id immediately. Only used with deploy action.',
    ),
  flowName: z
    .string()
    .optional()
    .describe(
      'Flow name for multi-settings flows. Only used with deploy action.',
    ),
  cursor: z
    .string()
    .optional()
    .describe(
      'Pagination cursor from a previous list response. Only used with the list action.',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Max items per page (1-100). Only used with the list action.'),
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

function listForResolver(
  client: ToolClient,
  projectId: string | undefined,
): ListDeploymentsForResolver {
  return async (q) => {
    const resp = (await client.listDeployments({
      projectId: projectId || q.projectId || undefined,
      flowId: q.flowId,
    })) as { deployments?: DeploymentSummaryForResolver[] };
    return resp.deployments ?? [];
  };
}

export function createDeployManageToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'deploy_manage',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => deployManageHandlerBody(client, input),
  };
}

async function deployManageHandlerBody(client: ToolClient, input: unknown) {
  const {
    action,
    projectId,
    flowId,
    slug,
    type,
    status,
    wait,
    flowName,
    cursor,
    limit,
  } = (input ?? {}) as {
    action?: 'deploy' | 'list' | 'get' | 'delete';
    projectId?: string;
    flowId?: string;
    slug?: string;
    type?: 'web' | 'server';
    status?: string;
    wait?: boolean;
    flowName?: string;
    cursor?: string;
    limit?: number;
  };
  const validationError = validateActionInput(
    'deploy_manage',
    action ?? '',
    { flowId, projectId },
    DEPLOY_MANAGE_REQUIREMENTS,
  );
  if (validationError) return mcpError(new Error(validationError));
  try {
    switch (action) {
      case 'deploy': {
        assertParam(flowId, 'flowId', 'deploy');
        const result = await client.deploy({
          flowId,
          wait: wait ?? true,
          flowName,
        });
        return mcpResult(redactDisplayNames(result), {
          next: [
            'Use deploy_manage with action "get" to check deployment status',
          ],
        });
      }

      case 'list': {
        const data = await client.listDeployments({
          projectId,
          flowId,
          type,
          status,
          cursor,
          limit,
        });
        return mcpResult(redactDisplayNames(data));
      }

      case 'get': {
        assertParam(flowId, 'flowId', 'get');
        const resolvedSlug = await resolveDeploymentSlug({
          projectId: projectId ?? '',
          flowId,
          slug,
          list: listForResolver(client, projectId),
        });
        const data = await client.getDeploymentBySlug({
          slug: resolvedSlug,
          projectId,
        });
        return mcpResult(redactDisplayNames(data));
      }

      case 'delete': {
        assertParam(flowId, 'flowId', 'delete');
        const resolvedSlug = await resolveDeploymentSlug({
          projectId: projectId ?? '',
          flowId,
          slug,
          list: listForResolver(client, projectId),
        });
        const data = await client.deleteDeployment({
          slug: resolvedSlug,
          projectId,
        });
        return mcpResult(
          redactDisplayNames({
            deleted: true,
            ...(data as Record<string, unknown>),
          }),
        );
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use one of: deploy, list, get, delete`,
        );
    }
  } catch (error) {
    return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
  }
}

export function registerDeployTool(server: McpServer, client: ToolClient) {
  const spec = createDeployManageToolSpec(client);
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
