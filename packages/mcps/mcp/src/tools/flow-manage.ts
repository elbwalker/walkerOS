import { z } from 'zod';
import {
  listAllFlows,
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';

export function registerFlowManageTool(server: McpServer) {
  server.registerTool(
    'flow_manage',
    {
      title: 'Flow Management',
      description:
        'Manage walkerOS flows. List, get, create, update, delete, or duplicate flows across projects.',
      inputSchema: {
        action: z
          .enum(['list', 'get', 'create', 'update', 'delete', 'duplicate'])
          .describe('Flow management action to perform'),
        flowId: z
          .string()
          .optional()
          .describe(
            'Flow ID (flow_...) or config ID (cfg_...). Required for get, update, delete, duplicate.',
          ),
        projectId: z
          .string()
          .optional()
          .describe(
            'Project ID. Optional filter for list (omit to list all projects). Required for create if no default project set.',
          ),
        name: z
          .string()
          .optional()
          .describe(
            'Flow name. Required for create. Optional for update (to rename) and duplicate.',
          ),
        content: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Flow.Config JSON content. Used for create and update.'),
        patch: z
          .boolean()
          .optional()
          .describe(
            'Merge-patch for update (default true). When true, only provided fields are updated.',
          ),
        fields: z
          .array(z.string())
          .optional()
          .describe(
            'Dot-path selectors for get to return only specific fields.',
          ),
        sort: z
          .enum(['name', 'updated_at', 'created_at'])
          .optional()
          .describe('Sort field for list.'),
        order: z
          .enum(['asc', 'desc'])
          .optional()
          .describe('Sort order for list.'),
        includeDeleted: z
          .boolean()
          .optional()
          .describe('Include soft-deleted flows in list results.'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      action,
      flowId,
      projectId,
      name,
      content,
      patch,
      fields,
      sort,
      order,
      includeDeleted,
    }) => {
      try {
        switch (action) {
          case 'list': {
            if (projectId) {
              const data = await listFlows({
                projectId,
                sort,
                order,
                includeDeleted,
              });
              return mcpResult(data);
            }
            const data = await listAllFlows({ sort, order, includeDeleted });
            return mcpResult(
              { projects: data },
              {
                next: [
                  'Use flow_manage with action "get" and a flowId to inspect a specific flow',
                  'Use flow_load to open a flow for editing',
                ],
              },
            );
          }

          case 'get': {
            if (!flowId) {
              return mcpError(
                new Error(
                  'flowId is required for get action. Use action "list" to see available flows.',
                ),
              );
            }
            const flow = await getFlow({ flowId, projectId, fields });
            return mcpResult(flow, {
              next: [
                'Use flow_load to open this flow for editing and validation',
              ],
            });
          }

          case 'create': {
            if (!name) {
              return mcpError(new Error('name is required for create action.'));
            }
            const created = await createFlow({
              name,
              content: content ?? {},
              projectId,
            });
            return mcpResult(created, {
              next: [
                'Use flow_load to open this flow for editing and validation',
              ],
            });
          }

          case 'update': {
            if (!flowId) {
              return mcpError(
                new Error(
                  'flowId is required for update action. Use action "list" to see available flows.',
                ),
              );
            }
            const updated = await updateFlow({
              flowId,
              projectId,
              name,
              content,
              mergePatch: patch ?? true,
            });
            return mcpResult(updated);
          }

          case 'delete': {
            if (!flowId) {
              return mcpError(
                new Error(
                  'flowId is required for delete action. Use action "list" to see available flows.',
                ),
              );
            }
            const deleted = await deleteFlow({ flowId, projectId });
            return mcpResult(deleted);
          }

          case 'duplicate': {
            if (!flowId) {
              return mcpError(
                new Error(
                  'flowId is required for duplicate action. Use action "list" to see available flows.',
                ),
              );
            }
            const duplicated = await duplicateFlow({
              flowId,
              name,
              projectId,
            });
            return mcpResult(duplicated);
          }

          default:
            throw new Error(
              `Unknown action: ${action}. Use one of: list, get, create, update, delete, duplicate`,
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
