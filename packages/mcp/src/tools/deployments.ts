import { z } from 'zod';
import {
  listDeployments,
  getDeploymentBySlug,
  createDeployment as createDep,
  updateDeployment as updateDep,
  deleteDeployment as deleteDep,
  publish,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { apiResult, apiError } from './helpers.js';

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
  // list-deployments
  server.registerTool(
    'list-deployments',
    {
      title: 'List Deployments',
      description: 'List all deployments in a project.',
      inputSchema: {
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        type: z.enum(['web', 'server']).optional().describe('Filter by type'),
        status: z.string().optional().describe('Filter by status'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ projectId, type, status }) => {
      try {
        return apiResult(await listDeployments({ projectId, type, status }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  // get-deployment (now by slug)
  server.registerTool(
    'get-deployment-by-slug',
    {
      title: 'Get Deployment',
      description: 'Get deployment details by slug.',
      inputSchema: {
        slug: z.string().describe('Deployment slug (e.g., k7x9m2p3q4r5)'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ slug, projectId }) => {
      try {
        return apiResult(await getDeploymentBySlug({ slug, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  // create-deployment
  server.registerTool(
    'create-deployment',
    {
      title: 'Create Deployment',
      description:
        'Create a new deployment. Type (web/server) is immutable after creation.',
      inputSchema: {
        type: z.enum(['web', 'server']).describe('Deployment type'),
        label: z.string().optional().describe('Human-readable label'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ type, label, projectId }) => {
      try {
        return apiResult(await createDep({ type, label, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  // update-deployment
  server.registerTool(
    'update-deployment',
    {
      title: 'Update Deployment',
      description: 'Update deployment metadata (label).',
      inputSchema: {
        slug: z.string().describe('Deployment slug'),
        label: z.string().optional().describe('New label'),
        projectId: z.string().optional().describe('Project ID'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ slug, label, projectId }) => {
      try {
        return apiResult(await updateDep({ slug, label, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  // delete-deployment
  server.registerTool(
    'delete-deployment',
    {
      title: 'Delete Deployment',
      description: 'Soft-delete a deployment.',
      inputSchema: {
        slug: z.string().describe('Deployment slug'),
        projectId: z.string().optional().describe('Project ID'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ slug, projectId }) => {
      try {
        return apiResult(await deleteDep({ slug, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  // publish
  server.registerTool(
    'publish',
    {
      title: 'Publish',
      description:
        'Publish a flow config to a deployment. Bundles and deploys the config. Returns status and URL.',
      inputSchema: {
        deployment: z.string().describe('Deployment slug'),
        configPath: z.string().describe('Path to flow config file (JSON)'),
        flowName: z
          .string()
          .optional()
          .describe('Flow name for multi-flow configs'),
        projectId: z.string().optional().describe('Project ID'),
        wait: z
          .boolean()
          .optional()
          .default(true)
          .describe('Wait for deployment to complete'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ deployment, configPath, flowName, projectId, wait }, extra) => {
      try {
        const progressToken = extra._meta?.progressToken;

        const result = await publish({
          deployment,
          config: configPath,
          flowName,
          projectId,
          wait,
          signal: extra.signal,
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
        });
        return apiResult(result);
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
