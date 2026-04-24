import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import { wrapUserData } from '../user-data.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';

function wrapProjectName<T extends { name?: string }>(p: T): T {
  return p.name !== undefined ? { ...p, name: wrapUserData(p.name) } : p;
}

const TITLE = 'Project Management';
const DESCRIPTION =
  'Manage walkerOS projects. List, create, update, delete projects, or set a default project for CLI operations.';

const inputSchema = {
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
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createProjectManageToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'project_manage',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => projectManageHandlerBody(client, input),
  };
}

async function projectManageHandlerBody(client: ToolClient, input: unknown) {
  const { action, projectId, name } = (input ?? {}) as {
    action?: 'list' | 'get' | 'create' | 'update' | 'delete' | 'set_default';
    projectId?: string;
    name?: string;
  };
  try {
    switch (action) {
      case 'list': {
        const projects = (await client.listProjects()) as
          | unknown[]
          | { projects?: unknown[] };
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
        const typedItems = items as Array<{ name?: string }>;
        const safe = Array.isArray(projects)
          ? typedItems.map(wrapProjectName)
          : { ...projects, projects: typedItems.map(wrapProjectName) };
        return mcpResult(safe);
      }

      case 'get': {
        if (!projectId) {
          return mcpError(
            new Error(
              'projectId is required for get action. Use action "list" to see available projects.',
            ),
          );
        }
        const project = await client.getProject({ projectId });
        return mcpResult(wrapProjectName(project as { name?: string }));
      }

      case 'create': {
        if (!name) {
          return mcpError(new Error('name is required for create action.'));
        }
        const created = await client.createProject({ name });
        return mcpResult(wrapProjectName(created as { name?: string }), {
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
        const updated = await client.updateProject({ projectId, name });
        return mcpResult(wrapProjectName(updated as { name?: string }));
      }

      case 'delete': {
        if (!projectId) {
          return mcpError(
            new Error(
              'projectId is required for delete action. Use action "list" to see available projects.',
            ),
          );
        }
        const deleted = await client.deleteProject({ projectId });
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
        client.setDefaultProject(projectId);
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
    return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
  }
}

export function registerProjectManageTool(
  server: McpServer,
  client: ToolClient,
) {
  const spec = createProjectManageToolSpec(client);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
