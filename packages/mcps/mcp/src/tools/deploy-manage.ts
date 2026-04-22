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
        'Deploy walkerOS flows and manage deployments. Deploy a flow, list deployments, get deployment details, or delete deployments. ' +
        'Note: the "get" and "delete" actions accept a deployment slug (e.g. "dep_..."), not a flow ID. ' +
        'If you only have a flowId, resolve the latest deployment slug first via flow_manage with action "get".',
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
            'Deployment slug (e.g. "dep_..."). Required for get and delete actions. ' +
              'This is the deployment slug, not a flow ID — if you only have a flowId, use flow_manage action "get" to resolve the latest deployment slug.',
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
            try {
              const data = await deleteDeployment({ slug: id, projectId });
              return mcpResult({ deleted: true, ...data });
            } catch (error) {
              if (isAuthError(error)) {
                return mcpError(error, AUTH_HINT);
              }
              const message =
                error instanceof Error ? error.message : String(error);
              if (/not[\s_-]?found|404/i.test(message)) {
                return mcpError(
                  error,
                  'Deployment not found. The "delete" action expects a deployment slug (e.g. "dep_..."), not a flow ID. If you only have a flowId, use flow_manage with action "get" to resolve the latest deployment slug first.',
                );
              }
              return mcpError(error);
            }
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
