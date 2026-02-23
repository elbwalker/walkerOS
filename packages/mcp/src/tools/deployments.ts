import { z } from 'zod';
import {
  listDeployments,
  getDeploymentBySlug,
  createDeployment as createDep,
  deleteDeployment as deleteDep,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiResult, apiError } from './helpers.js';

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
        'Create a new deployment. Type is inferred from flow content if provided, ' +
        'or can be set explicitly.',
      inputSchema: {
        type: z
          .enum(['web', 'server'])
          .optional()
          .describe('Deployment type (inferred from flowContent if omitted)'),
        flowContent: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Flow.Setup JSON to infer type from'),
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
    async ({ type, flowContent, label, projectId }) => {
      try {
        let resolvedType = type;
        if (!resolvedType && flowContent) {
          const flows = (flowContent as { flows?: Record<string, unknown> })
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
          return apiError(
            new Error('type required (provide type or flowContent)'),
          );
        }
        return apiResult(
          await createDep({ type: resolvedType, label, projectId }),
        );
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
}
