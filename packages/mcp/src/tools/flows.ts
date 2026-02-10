import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, requireProjectId } from '@walkeros/cli';

function apiResult(result: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}

function apiError(error: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
    isError: true as const,
  };
}

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
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ projectId, sort, order, includeDeleted }) => {
      try {
        const id = projectId ?? requireProjectId();
        const params = new URLSearchParams();
        if (sort) params.set('sort', sort);
        if (order) params.set('order', order);
        if (includeDeleted) params.set('include_deleted', 'true');
        const qs = params.toString();
        return apiResult(
          await apiRequest(`/api/projects/${id}/flows${qs ? `?${qs}` : ''}`),
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
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId }) => {
      try {
        const id = projectId ?? requireProjectId();
        return apiResult(
          await apiRequest(`/api/projects/${id}/flows/${flowId}`),
        );
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
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, content, projectId }) => {
      try {
        const id = projectId ?? requireProjectId();
        return apiResult(
          await apiRequest(`/api/projects/${id}/flows`, {
            method: 'POST',
            body: JSON.stringify({ name, content }),
          }),
        );
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'update-flow',
    {
      title: 'Update Flow',
      description:
        'Update a flow configuration name and/or content. Creates a version snapshot automatically.',
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
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, name, content, projectId }) => {
      try {
        const id = projectId ?? requireProjectId();
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (content !== undefined) body.content = content;
        return apiResult(
          await apiRequest(`/api/projects/${id}/flows/${flowId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }),
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
      description: 'Soft-delete a flow configuration. Can be restored later.',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId }) => {
      try {
        const id = projectId ?? requireProjectId();
        return apiResult(
          await apiRequest(`/api/projects/${id}/flows/${flowId}`, {
            method: 'DELETE',
          }),
        );
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
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, name, projectId }) => {
      try {
        const id = projectId ?? requireProjectId();
        const body = name ? { name } : {};
        return apiResult(
          await apiRequest(`/api/projects/${id}/flows/${flowId}/duplicate`, {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        );
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
