import { z } from 'zod';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiResult, apiError } from './helpers.js';
import {
  ListProjectsOutputShape,
  ProjectOutputShape,
  DeleteOutputShape,
} from '../schemas/output.js';

export function registerProjectTools(server: McpServer) {
  server.registerTool(
    'list-projects',
    {
      title: 'List Projects',
      description:
        'List all projects you have access to. Returns project IDs, names, and your role.',
      inputSchema: {},
      outputSchema: ListProjectsOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
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
      outputSchema: ProjectOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ projectId }) => {
      try {
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
      outputSchema: ProjectOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name }) => {
      try {
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
      outputSchema: ProjectOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ projectId, name }) => {
      try {
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
        'Soft-delete a project and all its flows. ' +
        'WARNING: This deletes the project and ALL associated flows and data. ' +
        'Uses WALKEROS_PROJECT_ID if projectId is omitted.',
      inputSchema: {
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
    async ({ projectId }) => {
      try {
        return apiResult(await deleteProject({ projectId }));
      } catch (error) {
        return apiError(error);
      }
    },
  );
}
