import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiResult, apiError } from './helpers.js';
import {
  ListFlowsOutputShape,
  FlowOutputShape,
  DeleteOutputShape,
} from '../schemas/output.js';

export function registerFlowTools(server: McpServer) {
  server.registerTool(
    'list-flows',
    {
      title: 'List Flows',
      description: 'List all flow configurations in a project.',
      inputSchema: {
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        sort: z
          .enum(['name', 'updated_at', 'created_at'])
          .optional()
          .describe('Sort field (default: updated_at)'),
        order: z
          .enum(['asc', 'desc'])
          .optional()
          .describe('Sort order (default: desc)'),
        includeDeleted: z
          .boolean()
          .optional()
          .describe('Include soft-deleted flows (default: false)'),
      },
      outputSchema: ListFlowsOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ projectId, sort, order, includeDeleted }) => {
      try {
        const { listFlows } = await import('@walkeros/cli');
        return apiResult(
          await listFlows({ projectId, sort, order, includeDeleted }),
        );
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'get-flow',
    {
      title: 'Get Flow',
      description:
        'Get a flow configuration with its full content (Flow.Setup JSON).',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: FlowOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId }) => {
      try {
        const { getFlow } = await import('@walkeros/cli');
        return apiResult(await getFlow({ flowId, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'create-flow',
    {
      title: 'Create Flow',
      description: 'Create a new flow configuration in a project.',
      inputSchema: {
        name: z.string().min(1).max(255).describe('Flow name'),
        content: z
          .record(z.string(), z.unknown())
          .describe('Flow.Setup JSON content (must have version: 1)'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: FlowOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, content, projectId }) => {
      try {
        const { createFlow } = await import('@walkeros/cli');
        return apiResult(await createFlow({ name, content, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'update-flow',
    {
      title: 'Update Flow',
      description: 'Update a flow configuration name and/or content.',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        name: z.string().min(1).max(255).optional().describe('New flow name'),
        content: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('New Flow.Setup JSON content'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: FlowOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, name, content, projectId }) => {
      try {
        const { updateFlow } = await import('@walkeros/cli');
        return apiResult(
          await updateFlow({ flowId, name, content, projectId }),
        );
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'delete-flow',
    {
      title: 'Delete Flow',
      description:
        'Soft-delete a flow configuration. ' +
        'WARNING: This removes the flow configuration. Can be restored later. ' +
        'Requires flowId.',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: DeleteOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId }) => {
      try {
        const { deleteFlow } = await import('@walkeros/cli');
        return apiResult(await deleteFlow({ flowId, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'duplicate-flow',
    {
      title: 'Duplicate Flow',
      description: 'Create a copy of an existing flow configuration.',
      inputSchema: {
        flowId: z.string().describe('Flow ID to duplicate (cfg_...)'),
        name: z
          .string()
          .optional()
          .describe('Name for the copy (defaults to "Copy of ...")'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: FlowOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, name, projectId }) => {
      try {
        const { duplicateFlow } = await import('@walkeros/cli');
        return apiResult(await duplicateFlow({ flowId, name, projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
