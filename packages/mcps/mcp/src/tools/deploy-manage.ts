import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  resolveDeploymentSlug,
  type DeploymentSummaryForResolver,
  type ListDeploymentsForResolver,
} from './_resolvers.js';

const TITLE = 'Deploy Management';
const DESCRIPTION =
  'Deploy walkerOS flows and manage deployments. ' +
  'For get/delete actions pass flowId (required) plus optional slug to disambiguate when a flow has multiple active deployments. ' +
  "If a flow has >=2 active deployments and no slug is supplied, the tool returns a MULTIPLE_DEPLOYMENTS error with a details[] list showing each deployment's slug, type, status, and updatedAt.";

const inputSchema = {
  action: z
    .enum(['deploy', 'list', 'get', 'delete'])
    .describe('Deployment action to perform'),
  projectId: z
    .string()
    .optional()
    .describe('Project ID. Optional; falls back to the default project.'),
  flowId: z
    .string()
    .optional()
    .describe(
      'Flow ID. Required for: deploy, get, delete. Optional filter for list.',
    ),
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
      'Wait for deploy to complete (default true). Only used with deploy action.',
    ),
  flowName: z
    .string()
    .optional()
    .describe(
      'Flow name for multi-settings flows. Only used with deploy action.',
    ),
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
  const { action, projectId, flowId, slug, type, status, wait, flowName } =
    (input ?? {}) as {
      action?: 'deploy' | 'list' | 'get' | 'delete';
      projectId?: string;
      flowId?: string;
      slug?: string;
      type?: 'web' | 'server';
      status?: string;
      wait?: boolean;
      flowName?: string;
    };
  try {
    switch (action) {
      case 'deploy': {
        if (!flowId) {
          return mcpError(
            new Error(
              'flowId is required for deploy action. Use flow_manage with action "list" to see available flows.',
            ),
          );
        }
        const result = await client.deploy({
          flowId,
          wait: wait ?? true,
          flowName,
        });
        return mcpResult(result, {
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
        });
        return mcpResult(data);
      }

      case 'get': {
        if (!flowId) {
          return mcpError(
            new Error(
              'flowId is required for get action. Use flow_manage with action "list" to see available flows.',
            ),
          );
        }
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
        return mcpResult(data);
      }

      case 'delete': {
        if (!flowId) {
          return mcpError(
            new Error(
              'flowId is required for delete action. Use flow_manage with action "list" to see available flows.',
            ),
          );
        }
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
        return mcpResult({
          deleted: true,
          ...(data as Record<string, unknown>),
        });
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
