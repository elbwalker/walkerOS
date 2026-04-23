import { z } from 'zod';
import {
  deploy as deployFlow,
  listDeployments,
  getDeploymentBySlug,
  deleteDeployment,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import {
  resolveDeploymentSlug,
  type DeploymentSummaryForResolver,
  type ListDeploymentsForResolver,
} from './_resolvers.js';

/**
 * Wraps the CLI's listDeployments for use as the resolver's injected list
 * function. Narrows the response to the fields the resolver needs.
 */
function listForResolver(
  projectId: string | undefined,
): ListDeploymentsForResolver {
  return async (q) => {
    const resp = (await listDeployments({
      projectId: projectId ?? q.projectId,
      flowId: q.flowId,
    })) as { deployments?: DeploymentSummaryForResolver[] };
    return resp.deployments ?? [];
  };
}

export function registerDeployTool(server: McpServer) {
  server.registerTool(
    'deploy_manage',
    {
      title: 'Deploy Management',
      description:
        'Deploy walkerOS flows and manage deployments. ' +
        'For get/delete actions pass flowId (required) plus optional slug to disambiguate when a flow has multiple active deployments. ' +
        "If a flow has >=2 active deployments and no slug is supplied, the tool returns a MULTIPLE_DEPLOYMENTS error with a details[] list showing each deployment's slug, type, status, and updatedAt.",
      inputSchema: {
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
      },
      // No outputSchema: action-dispatched tool — each action returns a different shape
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      action,
      projectId,
      flowId,
      slug,
      type,
      status,
      wait,
      flowName,
    }) => {
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
            const result = await deployFlow({
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
            const data = await listDeployments({
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
              list: listForResolver(projectId),
            });
            const data = await getDeploymentBySlug({
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
              list: listForResolver(projectId),
            });
            const data = await deleteDeployment({
              slug: resolvedSlug,
              projectId,
            });
            return mcpResult({ deleted: true, ...data });
          }

          default:
            throw new Error(
              `Unknown action: ${action}. Use one of: deploy, list, get, delete`,
            );
        }
      } catch (error) {
        return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
      }
    },
  );
}
