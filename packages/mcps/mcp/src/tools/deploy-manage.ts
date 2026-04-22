import { z } from 'zod';
import {
  deploy as deployFlow,
  listDeployments,
  getDeployment,
  getDeploymentBySlug,
  deleteDeployment,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';

export function registerDeployTool(server: McpServer) {
  server.registerTool(
    'deploy_manage',
    {
      title: 'Deploy Management',
      description:
        'Deploy walkerOS flows and manage deployments. Deploy a flow, list deployments, get deployment details, or delete deployments.',
      inputSchema: {
        action: z
          .enum(['deploy', 'list', 'get', 'delete'])
          .describe('Deployment action to perform'),
        flowId: z
          .string()
          .optional()
          .describe('Flow ID. Required for deploy action.'),
        id: z
          .string()
          .optional()
          .describe(
            'Deployment ID or slug. Required for get and delete actions.',
          ),
        projectId: z
          .string()
          .optional()
          .describe('Project ID. Optional filter for list.'),
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
    async ({ action, flowId, id, projectId, type, status, wait, flowName }) => {
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
            const data = await listDeployments({ projectId, type, status });
            return mcpResult(data);
          }

          case 'get': {
            if (!id) {
              return mcpError(
                new Error(
                  'id is required for get action. Use deploy_manage with action "list" to see available deployments.',
                ),
              );
            }
            try {
              const data = await getDeploymentBySlug({ slug: id, projectId });
              return mcpResult(data);
            } catch {
              const data = await getDeployment({ flowId: id, projectId });
              return mcpResult(data);
            }
          }

          case 'delete': {
            if (!id) {
              return mcpError(
                new Error(
                  'id is required for delete action. Use deploy_manage with action "list" to see available deployments.',
                ),
              );
            }
            const data = await deleteDeployment({ slug: id, projectId });
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
