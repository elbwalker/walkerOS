import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, requireProjectId } from '../api/client.js';

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

export function registerVersionTools(server: McpServer) {
  server.registerTool(
    'list-versions',
    {
      title: 'List Versions',
      description: 'List version history for a flow configuration.',
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
          await apiRequest(`/api/projects/${id}/flows/${flowId}/versions`),
        );
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'get-version',
    {
      title: 'Get Version',
      description:
        'Get a specific version of a flow configuration, including its full content.',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        version: z.number().int().positive().describe('Version number'),
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
    async ({ flowId, version, projectId }) => {
      try {
        const id = projectId ?? requireProjectId();
        return apiResult(
          await apiRequest(
            `/api/projects/${id}/flows/${flowId}/versions/${version}`,
          ),
        );
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'restore-version',
    {
      title: 'Restore Version',
      description:
        'Restore a flow configuration to a previous version. The current content becomes a new version in history.',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        version: z
          .number()
          .int()
          .positive()
          .describe('Version number to restore'),
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
    async ({ flowId, version, projectId }) => {
      try {
        const id = projectId ?? requireProjectId();
        return apiResult(
          await apiRequest(
            `/api/projects/${id}/flows/${flowId}/versions/${version}/restore`,
            { method: 'POST' },
          ),
        );
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
