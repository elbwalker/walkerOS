import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthenticationError, AUTH_HINT } from '../types.js';
import { wrapUserData } from '../user-data.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import { fieldsOf, isRecord, stringField } from './narrow.js';
import { parseToolInput } from './parse-input.js';
import {
  validateActionInput,
  assertParam,
  PROJECT_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';

/** A project record with its display name wrapped as user data. */
function wrapProjectName(project: unknown): unknown {
  const name = stringField(project, 'name');
  return isRecord(project) && name !== undefined
    ? { ...project, name: wrapUserData(name) }
    : project;
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
  const parsed = parseToolInput(inputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { action, projectId, name, cursor, limit } = parsed.data;
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
        const projects = await client.listProjects({ cursor, limit });
        const listed = isRecord(projects) ? projects.projects : undefined;
        const items = Array.isArray(projects)
          ? projects
          : Array.isArray(listed)
            ? listed
            : [];
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
        const safe = Array.isArray(projects)
          ? items.map(wrapProjectName)
          : { ...fieldsOf(projects), projects: items.map(wrapProjectName) };
        return mcpResult(safe);
      }

      case 'get': {
        const project = await client.getProject({ projectId });
        return mcpResult(wrapProjectName(project));
      }

      case 'create': {
        assertParam(name, 'name', 'create');
        const created = await client.createProject({ name });
        return mcpResult(wrapProjectName(created), {
          next: [
            'Use project_manage with action "set_default" to make this your active project',
          ],
        });
      }

      case 'update': {
        assertParam(name, 'name', 'update');
        const updated = await client.updateProject({ projectId, name });
        return mcpResult(wrapProjectName(updated));
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
    return mcpError(
      error,
      isAuthenticationError(error) ? AUTH_HINT : undefined,
    );
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
    (args) => projectManageHandlerBody(client, args),
  );
}
