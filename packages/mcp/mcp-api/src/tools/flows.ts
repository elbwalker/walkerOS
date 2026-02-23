import { z } from 'zod';
import {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import {
  ListFlowsOutputShape,
  FlowOutputShape,
  DeleteOutputShape,
} from '../schemas/output.js';

export function registerFlowTools(server: McpServer) {
  server.registerTool(
    'flow_list',
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
        return mcpResult(
          await listFlows({ projectId, sort, order, includeDeleted }),
        );
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    'flow_get',
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
        return mcpResult(await getFlow({ flowId, projectId }));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    'flow_create',
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
        return mcpResult(await createFlow({ name, content, projectId }));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    'flow_update',
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
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ flowId, name, content, projectId }) => {
      try {
        return mcpResult(
          await updateFlow({ flowId, name, content, projectId }),
        );
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    'flow_delete',
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
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ flowId, projectId }) => {
      try {
        return mcpResult(await deleteFlow({ flowId, projectId }));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    'flow_duplicate',
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
        return mcpResult(await duplicateFlow({ flowId, name, projectId }));
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
