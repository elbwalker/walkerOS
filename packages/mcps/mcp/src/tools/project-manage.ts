import { z } from 'zod';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  setDefaultProject,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';

export function registerProjectManageTool(server: McpServer) {
  server.registerTool(
    'project_manage',
    {
      title: 'Project Management',
      description:
        'Manage walkerOS projects. List, create, update, delete projects, or set a default project for CLI operations.',
      inputSchema: {
        action: z
          .enum(['list', 'get', 'create', 'update', 'delete', 'set_default'])
          .describe('Project management action to perform'),
        projectId: z
          .string()
          .optional()
          .describe(
            'Project ID. Required for get, update, delete, and set_default actions.',
          ),
        name: z
          .string()
          .optional()
          .describe(
            'Project name. Required for create. Optional for update (to rename).',
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ action, projectId, name }) => {
      try {
        switch (action) {
          case 'list': {
            const projects = await listProjects();
            const items = Array.isArray(projects)
              ? projects
              : projects?.projects || [];
            if (items.length === 0) {
              return mcpResult(
                { projects: [] },
                {
                  next: [
                    'Use project_manage with action "create" to create your first project',
                    'Use project_manage with action "set_default" after creating to set it as default',
                  ],
                },
              );
            }
            return mcpResult(projects);
          }

          case 'get': {
            if (!projectId) {
              return mcpError(
                new Error(
                  'projectId is required for get action. Use action "list" to see available projects.',
                ),
              );
            }
            const project = await getProject({ projectId });
            return mcpResult(project);
          }

          case 'create': {
            if (!name) {
              return mcpError(new Error('name is required for create action.'));
            }
            const created = await createProject({ name });
            return mcpResult(created, {
              next: [
                'Use project_manage with action "set_default" to make this your active project',
              ],
            });
          }

          case 'update': {
            if (!projectId) {
              return mcpError(
                new Error(
                  'projectId is required for update action. Use action "list" to see available projects.',
                ),
              );
            }
            if (!name) {
              return mcpError(new Error('name is required for update action.'));
            }
            const updated = await updateProject({ projectId, name });
            return mcpResult(updated);
          }

          case 'delete': {
            if (!projectId) {
              return mcpError(
                new Error(
                  'projectId is required for delete action. Use action "list" to see available projects.',
                ),
              );
            }
            const deleted = await deleteProject({ projectId });
            return mcpResult(deleted);
          }

          case 'set_default': {
            if (!projectId) {
              return mcpError(
                new Error(
                  'projectId is required for set_default action. Use action "list" to see available projects.',
                ),
              );
            }
            setDefaultProject(projectId);
            return mcpResult(
              { defaultProjectId: projectId },
              {
                next: [
                  'Use flow_manage with action "list" to see flows in this project',
                ],
              },
            );
          }

          default:
            throw new Error(
              `Unknown action: ${action}. Use one of: list, get, create, update, delete, set_default`,
            );
        }
      } catch (error) {
        return mcpError(
          error,
          'Are you logged in? Use auth(action: "status") to check.',
        );
      }
    },
  );
}
