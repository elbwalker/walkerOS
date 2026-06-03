import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import { wrapUserData } from '../user-data.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  validateActionInput,
  assertParam,
  PROJECT_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';

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
    .describe('Required for get, update, delete, set_default.'),
  name: z
    .string()
    .optional()
    .describe(
      'Required for create and update (update also requires projectId).',
    ),
  cursor: z
    .string()
    .optional()
    .describe(
      'Pagination cursor from a previous list response. Only used with the list action.',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Max items per page (1-100). Only used with the list action.'),
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
  const { action, projectId, name, cursor, limit } = (input ?? {}) as {
    action?: 'list' | 'get' | 'create' | 'update' | 'delete' | 'set_default';
    projectId?: string;
    name?: string;
    cursor?: string;
    limit?: number;
  };
  const validationError = validateActionInput(
    'project_manage',
    action ?? '',
    { projectId, name },
    PROJECT_MANAGE_REQUIREMENTS,
  );
  if (validationError) return mcpError(new Error(validationError));
  try {
    switch (action) {
      case 'list': {
        const projects = (await client.listProjects({ cursor, limit })) as
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
        const project = await client.getProject({ projectId });
        return mcpResult(wrapProjectName(project as { name?: string }));
      }

      case 'create': {
        assertParam(name, 'name', 'create');
        const created = await client.createProject({ name });
        return mcpResult(wrapProjectName(created as { name?: string }), {
          next: [
            'Use project_manage with action "set_default" to make this your active project',
          ],
        });
      }

      case 'update': {
        assertParam(name, 'name', 'update');
        const updated = await client.updateProject({ projectId, name });
        return mcpResult(wrapProjectName(updated as { name?: string }));
      }

      case 'delete': {
        const deleted = await client.deleteProject({ projectId });
        return mcpResult(deleted);
      }

      case 'set_default': {
        assertParam(projectId, 'projectId', 'set_default');
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
