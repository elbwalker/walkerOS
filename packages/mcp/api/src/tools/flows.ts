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
  FlowWriteOutputShape,
  DeleteOutputShape,
} from '../schemas/output.js';

function summarizeFlow(flow: Record<string, unknown>): string {
  const content = flow.content as Record<string, unknown> | undefined;
  if (!content) return `Flow "${flow.name}" (${flow.id})`;

  const version = content.version ?? '?';
  const flowConfigs = content.flows as Record<string, unknown> | undefined;
  const variables = content.variables as Record<string, unknown> | undefined;

  const parts = [`Flow "${flow.name}" (${flow.id}) | v${version}`];

  if (variables && Object.keys(variables).length > 0) {
    parts.push(`variables: ${Object.keys(variables).join(', ')}`);
  }

  if (flowConfigs) {
    for (const [name, config] of Object.entries(flowConfigs)) {
      const cfg = config as Record<string, unknown>;
      const sources = cfg.sources as Record<string, unknown> | undefined;
      const destinations = cfg.destinations as
        | Record<string, unknown>
        | undefined;
      const transformers = cfg.transformers as
        | Record<string, unknown>
        | undefined;
      const stores = cfg.stores as Record<string, unknown> | undefined;

      const counts = [
        sources && `${Object.keys(sources).length} sources`,
        destinations && `${Object.keys(destinations).length} destinations`,
        transformers && `${Object.keys(transformers).length} transformers`,
        stores && `${Object.keys(stores).length} stores`,
      ].filter(Boolean);

      parts.push(`${name}(${counts.join(', ') || 'empty'})`);
    }
  }

  return parts.join(' | ');
}

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
        'Get a flow configuration with its full content (Flow.Setup JSON). ' +
        'Use fields to request only specific sections (e.g., ["content.variables", "content.flows.web.sources"]).',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        fields: z
          .array(z.string())
          .optional()
          .describe(
            'Dot-path field selectors to return only specific sections. ' +
              'Examples: ["content.variables"], ["content.flows.web.sources", "content.flows.web.destinations"]. ' +
              'Omit for full content.',
          ),
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
    async ({ flowId, fields, projectId }) => {
      try {
        const result = await getFlow({ flowId, projectId, fields });
        return mcpResult(
          result,
          summarizeFlow(result as Record<string, unknown>),
        );
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
          .describe('Flow.Setup JSON content (version: 1 or 2)'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: FlowWriteOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, content, projectId }) => {
      try {
        const result = await createFlow({ name, content, projectId });
        const {
          id,
          name: flowName,
          createdAt,
          updatedAt,
        } = result as Record<string, unknown>;
        return mcpResult(
          { id, name: flowName, createdAt, updatedAt },
          `Created flow "${flowName}" (${id})`,
        );
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    'flow_update',
    {
      title: 'Update Flow',
      description:
        'Update a flow configuration name and/or content. ' +
        'Set patch: true to merge changes into existing content (only send fields you want to change). ' +
        'Set a field to null to remove it. Without patch, content is fully replaced.',
      inputSchema: {
        flowId: z.string().describe('Flow ID (cfg_...)'),
        name: z.string().min(1).max(255).optional().describe('New flow name'),
        content: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Flow.Setup JSON content. With patch:true, only include changed fields.',
          ),
        patch: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            'Use merge-patch semantics (default: true). Only send changed fields.',
          ),
        projectId: z
          .string()
          .optional()
          .describe('Project ID (defaults to WALKEROS_PROJECT_ID)'),
      },
      outputSchema: FlowWriteOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ flowId, name, content, patch, projectId }) => {
      try {
        const result = await updateFlow({
          flowId,
          name,
          content,
          projectId,
          mergePatch: patch ?? true,
        });
        const {
          id,
          name: flowName,
          createdAt,
          updatedAt,
        } = result as Record<string, unknown>;
        return mcpResult(
          { id, name: flowName, createdAt, updatedAt },
          `Updated flow "${flowName}" (${id})`,
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
      outputSchema: FlowWriteOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ flowId, name, projectId }) => {
      try {
        const result = await duplicateFlow({ flowId, name, projectId });
        const {
          id,
          name: flowName,
          createdAt,
          updatedAt,
        } = result as Record<string, unknown>;
        return mcpResult(
          { id, name: flowName, createdAt, updatedAt },
          `Duplicated flow "${flowName}" (${id})`,
        );
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
