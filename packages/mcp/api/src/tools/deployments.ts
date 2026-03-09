import { z } from 'zod';
import {
  deploy,
  getDeployment,
  listDeployments,
  getDeploymentBySlug,
  createDeployment as createDep,
  deleteDeployment as deleteDep,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { mcpResult, mcpError } from '@walkeros/core';
import {
  DeployFlowOutputShape,
  DeploymentOutputShape,
  ListDeploymentsOutputShape,
  CreateDeploymentOutputShape,
  DeleteOutputShape,
} from '../schemas/output.js';

function statusToProgress(
  status: string,
  substatus?: string | null,
): { value: number; total: number; message: string } {
  const stages: Record<string, { value: number; message: string }> = {
    bundling: { value: 15, message: 'Bundling...' },
    'bundling:building': { value: 20, message: 'Building bundle...' },
    'bundling:publishing': { value: 80, message: 'Publishing...' },
    deploying: { value: 55, message: 'Deploying...' },
    'deploying:provisioning': {
      value: 50,
      message: 'Provisioning container...',
    },
    'deploying:starting': { value: 65, message: 'Starting container...' },
    published: { value: 100, message: 'Published' },
    active: { value: 100, message: 'Active' },
    failed: { value: 100, message: 'Failed' },
  };

  const key = substatus ? `${status}:${substatus}` : status;
  const stage = stages[key] ?? stages[status] ?? { value: 0, message: status };
  return { value: stage.value, total: 100, message: stage.message };
}

export function registerDeploymentTools(server: McpServer) {
  // deploy-flow
  server.registerTool(
    'deploy_flow',
    {
      title: 'Deploy Flow',
      description:
        'Deploy a flow to walkerOS cloud. Auto-detects web (CDN) or server (container) from flow content.\n\nServer flows require an HTTP source (e.g., @walkeros/server-source-express) with port: 8080 and status: true for health checks. The runtime PORT env var overrides the config port automatically.\n\nReturns deployment status and public URL. Use wait: false to return immediately.',
      inputSchema: {
        flowId: z.string().describe('Flow ID to deploy'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        wait: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            'Wait for deployment to complete (default: true). Set to false to return immediately after triggering.',
          ),
        flowName: z
          .string()
          .optional()
          .describe(
            'Flow name for multi-settings flows. Required when a flow has multiple settings.',
          ),
      },
      outputSchema: DeployFlowOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId, wait, flowName }, extra) => {
      try {
        const progressToken = extra._meta?.progressToken;

        const result = await deploy({
          flowId,
          projectId,
          wait,
          flowName,
          onStatus: (status, substatus) => {
            if (!progressToken) return;

            const { value, total, message } = statusToProgress(
              status,
              substatus,
            );
            extra.sendNotification({
              method: 'notifications/progress',
              params: { progressToken, progress: value, total, message },
            } as ServerNotification);
          },
          signal: extra.signal,
        });

        return mcpResult(result);
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  // get-deployment (unified: accepts flowId OR slug)
  server.registerTool(
    'deployment_get',
    {
      title: 'Get Deployment',
      description:
        'Get deployment details by flow ID or slug. Provide exactly one of flowId or slug.',
      inputSchema: {
        flowId: z
          .string()
          .optional()
          .describe('Flow ID to check (provide flowId or slug, not both)'),
        slug: z
          .string()
          .optional()
          .describe(
            'Deployment slug (e.g., k7x9m2p3q4r5) (provide flowId or slug, not both)',
          ),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        flowName: z
          .string()
          .optional()
          .describe(
            'Flow name for multi-settings flows. Required when a flow has multiple settings.',
          ),
      },
      outputSchema: DeploymentOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ flowId, slug, projectId, flowName }) => {
      try {
        if (flowId && slug) {
          return mcpError(new Error('Provide either flowId or slug, not both'));
        }
        if (!flowId && !slug) {
          return mcpError(new Error('Provide either flowId or slug'));
        }

        if (slug) {
          return mcpResult(await getDeploymentBySlug({ slug, projectId }));
        }

        return mcpResult(
          await getDeployment({ flowId: flowId!, projectId, flowName }),
        );
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  // list-deployments
  server.registerTool(
    'deployment_list',
    {
      title: 'List Deployments',
      description: 'List all deployments in a project.',
      inputSchema: {
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        type: z.enum(['web', 'server']).optional().describe('Filter by type'),
        status: z
          .enum([
            'bundling',
            'deploying',
            'active',
            'failed',
            'deleted',
            'published',
          ])
          .optional()
          .describe('Filter by status'),
      },
      outputSchema: ListDeploymentsOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ projectId, type, status }) => {
      try {
        return mcpResult(await listDeployments({ projectId, type, status }));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  // create-deployment
  server.registerTool(
    'deployment_create',
    {
      title: 'Create Deployment',
      description:
        'Create a new deployment. Type is inferred from flow content if provided, ' +
        'or can be set explicitly.',
      inputSchema: {
        type: z
          .enum(['web', 'server'])
          .optional()
          .describe('Deployment type (inferred from flowConfig if omitted)'),
        flowConfig: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Flow.Config JSON to infer type from'),
        label: z.string().optional().describe('Human-readable label'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: CreateDeploymentOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ type, flowConfig, label, projectId }) => {
      try {
        let resolvedType = type;
        if (!resolvedType && flowConfig) {
          const flows = (flowConfig as { flows?: Record<string, unknown> })
            .flows;
          if (flows) {
            const firstFlow = Object.values(flows)[0] as Record<
              string,
              unknown
            >;
            if (firstFlow) {
              resolvedType =
                'web' in firstFlow
                  ? 'web'
                  : 'server' in firstFlow
                    ? 'server'
                    : undefined;
            }
          }
        }
        if (!resolvedType) {
          return mcpError(
            new Error('type required (provide type or flowConfig)'),
          );
        }
        return mcpResult(
          await createDep({ type: resolvedType, label, projectId }),
        );
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  // delete-deployment
  server.registerTool(
    'deployment_delete',
    {
      title: 'Delete Deployment',
      description: 'Soft-delete a deployment.',
      inputSchema: {
        slug: z.string().describe('Deployment slug'),
        projectId: z.string().optional().describe('Project ID'),
      },
      outputSchema: DeleteOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ slug, projectId }) => {
      try {
        return mcpResult(await deleteDep({ slug, projectId }));
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
