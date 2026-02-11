import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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

export function registerProjectTools(server: McpServer) {
  server.registerTool(
    'list-projects',
    {
      title: 'List Projects',
      description:
        'List all projects you have access to. Returns project IDs, names, and your role.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const { listProjects } = await import('@walkeros/cli');
        return apiResult(await listProjects());
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'get-project',
    {
      title: 'Get Project',
      description:
        'Get details for a project. Uses WALKEROS_PROJECT_ID if projectId is omitted.',
      inputSchema: {
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
    async ({ projectId }) => {
      try {
        const { getProject } = await import('@walkeros/cli');
        return apiResult(await getProject({ projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'create-project',
    {
      title: 'Create Project',
      description: 'Create a new project.',
      inputSchema: {
        name: z.string().min(1).max(255).describe('Project name'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name }) => {
      try {
        const { createProject } = await import('@walkeros/cli');
        return apiResult(await createProject({ name }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'update-project',
    {
      title: 'Update Project',
      description:
        'Update a project name. Uses WALKEROS_PROJECT_ID if projectId is omitted.',
      inputSchema: {
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
        name: z.string().min(1).max(255).describe('New project name'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ projectId, name }) => {
      try {
        const { updateProject } = await import('@walkeros/cli');
        return apiResult(await updateProject({ projectId, name }));
      } catch (error) {
        return apiError(error);
      }
    },
  );

  server.registerTool(
    'delete-project',
    {
      title: 'Delete Project',
      description:
        'Soft-delete a project and all its flows. Uses WALKEROS_PROJECT_ID if projectId is omitted.',
      inputSchema: {
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
    async ({ projectId }) => {
      try {
        const { deleteProject } = await import('@walkeros/cli');
        return apiResult(await deleteProject({ projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
