import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import { wrapUserData, redactNestedStrings } from '../user-data.js';
import { flowCanvasResult } from '../ui-parts.js';

/** Peek at a Flow.Config and decide whether it's web-flavoured or
 *  server-flavoured. Flow.Config is keyed by platform at the top level. If
 *  both exist the web half wins (rare — dual-platform flows are an
 *  advanced case we don't render in chat bubbles). */
function pickPlatform(config: unknown): 'web' | 'server' {
  if (config && typeof config === 'object' && 'web' in (config as object)) {
    return 'web';
  }
  return 'server';
}

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';

// Keys whose string values must remain literal so the LLM can reference them
// (ids, dates, immutable identifiers). Everything else that's a string goes
// through wrapUserData.
const KEEP_LITERAL = new Set([
  'id',
  'flowId',
  'projectId',
  'previewId',
  'version',
  'slug',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);
const keepLiteral = (key: string) => KEEP_LITERAL.has(key);

function safeSummary<T extends { name?: string }>(flow: T): T {
  return flow.name !== undefined
    ? { ...flow, name: wrapUserData(flow.name) }
    : flow;
}

function safeDetail<T extends { name?: string; config?: unknown }>(flow: T): T {
  const withName =
    flow.name !== undefined
      ? { ...flow, name: wrapUserData(flow.name) }
      : { ...flow };
  if (flow.config !== undefined) {
    (withName as { config?: unknown }).config = redactNestedStrings(
      flow.config,
      { skip: keepLiteral },
    );
  }
  return withName as T;
}

const TITLE = 'Flow Management';
const DESCRIPTION =
  'Manage walkerOS flows and their previews. List/get/create/update/delete/duplicate flows, or create/inspect/delete preview bundles for testing flow changes on live sites.';

const inputSchema = {
  action: z
    .enum([
      'list',
      'get',
      'create',
      'update',
      'delete',
      'duplicate',
      'preview_list',
      'preview_get',
      'preview_create',
      'preview_delete',
    ])
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
    .describe('Dot-path selectors for get to return only specific fields.'),
  sort: z
    .enum(['name', 'updated_at', 'created_at'])
    .optional()
    .describe('Sort field for list.'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort order for list.'),
  includeDeleted: z
    .boolean()
    .optional()
    .describe('Include soft-deleted flows in list results.'),
  previewId: z
    .string()
    .optional()
    .describe(
      'Preview ID (prv_...). Required for preview_get and preview_delete.',
    ),
  flowName: z
    .string()
    .optional()
    .describe(
      'Flow settings name. Used by preview_create as an alternative to flowSettingsId.',
    ),
  flowSettingsId: z
    .string()
    .optional()
    .describe(
      'Flow settings ID. Used by preview_create as an alternative to flowName.',
    ),
  siteUrl: z
    .string()
    .optional()
    .describe(
      'Optional site URL for preview_create. When provided, the response includes full activationUrl and deactivationUrl the user can click.',
    ),
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createFlowManageToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'flow_manage',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowManageHandlerBody(client, input),
  };
}

async function flowManageHandlerBody(client: ToolClient, input: unknown) {
  const {
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
    previewId,
    flowName,
    flowSettingsId,
    siteUrl,
  } = (input ?? {}) as {
    action?:
      | 'list'
      | 'get'
      | 'create'
      | 'update'
      | 'delete'
      | 'duplicate'
      | 'preview_list'
      | 'preview_get'
      | 'preview_create'
      | 'preview_delete';
    flowId?: string;
    projectId?: string;
    name?: string;
    content?: Record<string, unknown>;
    patch?: boolean;
    fields?: string[];
    sort?: 'name' | 'updated_at' | 'created_at';
    order?: 'asc' | 'desc';
    includeDeleted?: boolean;
    previewId?: string;
    flowName?: string;
    flowSettingsId?: string;
    siteUrl?: string;
  };
  try {
    switch (action) {
      case 'list': {
        if (projectId) {
          const data = await client.listFlows({
            projectId,
            sort,
            order,
            includeDeleted,
          });
          const dataObj = data as { flows?: Array<{ name?: string }> };
          const flows = dataObj.flows;
          const safe = Array.isArray(flows)
            ? { ...dataObj, flows: flows.map(safeSummary) }
            : data;
          return mcpResult(safe);
        }
        const data = await client.listAllFlows({
          sort,
          order,
          includeDeleted,
        });
        const safe = Array.isArray(data)
          ? (data as Array<{ name?: string }>).map(safeSummary)
          : data;
        return mcpResult(
          { projects: safe },
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
        const flow = await client.getFlow({ flowId, projectId, fields });
        const safe = safeDetail(
          flow as {
            id?: string;
            name?: string;
            config?: Record<string, unknown>;
          },
        );
        return flowCanvasResult({
          flowId: safe.id,
          configName: safe.name ?? 'default',
          platform: pickPlatform(safe.config),
          flowConfig: (safe.config ?? {}) as Record<string, unknown>,
          suggestions: [
            {
              label: 'Validate this flow',
              prompt: `Validate flow ${safe.id}`,
              autoSend: true,
            },
            {
              label: 'Add a destination',
              prompt: `Help me add a destination to flow ${safe.id}`,
            },
          ],
        });
      }

      case 'create': {
        if (!name) {
          return mcpError(new Error('name is required for create action.'));
        }
        const created = await client.createFlow({
          name,
          content: content ?? {},
          projectId,
        });
        const safeCreated = safeDetail(
          created as {
            id?: string;
            name?: string;
            config?: Record<string, unknown>;
          },
        );
        return flowCanvasResult({
          flowId: safeCreated.id,
          configName: safeCreated.name ?? 'default',
          platform: pickPlatform(safeCreated.config),
          flowConfig: (safeCreated.config ?? {}) as Record<string, unknown>,
          suggestions: [
            {
              label: 'Validate this flow',
              prompt: `Validate flow ${safeCreated.id}`,
              autoSend: true,
            },
            {
              label: 'Deploy it',
              prompt: `Deploy flow ${safeCreated.id}`,
            },
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
        const updated = await client.updateFlow({
          flowId,
          projectId,
          name,
          content,
          mergePatch: patch ?? true,
        });
        const safeUpdated = safeDetail(
          updated as {
            id?: string;
            name?: string;
            config?: Record<string, unknown>;
          },
        );
        return flowCanvasResult({
          flowId: safeUpdated.id,
          configName: safeUpdated.name ?? 'default',
          platform: pickPlatform(safeUpdated.config),
          flowConfig: (safeUpdated.config ?? {}) as Record<string, unknown>,
          suggestions: [
            {
              label: 'Validate this flow',
              prompt: `Validate flow ${safeUpdated.id}`,
              autoSend: true,
            },
            {
              label: 'Deploy it',
              prompt: `Deploy flow ${safeUpdated.id}`,
            },
          ],
        });
      }

      case 'delete': {
        if (!flowId) {
          return mcpError(
            new Error(
              'flowId is required for delete action. Use action "list" to see available flows.',
            ),
          );
        }
        const deleted = await client.deleteFlow({ flowId, projectId });
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
        const duplicated = await client.duplicateFlow({
          flowId,
          name,
          projectId,
        });
        return mcpResult(
          safeDetail(duplicated as { name?: string; config?: unknown }),
        );
      }

      case 'preview_list': {
        if (!flowId) {
          return mcpError(
            new Error(
              'flowId is required for preview_list. Use action "list" to see available flows.',
            ),
          );
        }
        const data = await client.listPreviews({ projectId, flowId });
        return mcpResult(data);
      }

      case 'preview_get': {
        if (!flowId || !previewId) {
          return mcpError(
            new Error('flowId and previewId are required for preview_get.'),
          );
        }
        const data = await client.getPreview({
          projectId,
          flowId,
          previewId,
        });
        return mcpResult(data);
      }

      case 'preview_create': {
        if (!flowId) {
          return mcpError(new Error('flowId is required for preview_create.'));
        }
        if (!flowName && !flowSettingsId) {
          return mcpError(
            new Error(
              'flowName or flowSettingsId is required for preview_create.',
            ),
          );
        }
        const preview = await client.createPreview({
          projectId,
          flowId,
          flowName,
          flowSettingsId,
        });
        const typedPreview = preview as {
          id: string;
          token: string;
          activationUrl: string;
          bundleUrl: string;
          createdBy: string;
          createdAt: string;
          [key: string]: unknown;
        };
        const enriched: Record<string, unknown> = {
          ...typedPreview,
          activationParam: typedPreview.activationUrl,
        };
        if (siteUrl) {
          const on = new URL(siteUrl);
          on.searchParams.set('elbPreview', typedPreview.token);
          enriched.activationUrl = on.toString();

          const off = new URL(siteUrl);
          off.searchParams.set('elbPreview', 'off');
          enriched.deactivationUrl = off.toString();
        } else {
          delete enriched.activationUrl;
        }
        return mcpResult(enriched, {
          next: siteUrl
            ? [
                'Open activationUrl to activate preview mode; open deactivationUrl to exit.',
              ]
            : [
                'Append activationParam to any URL on your site to activate preview mode.',
              ],
        });
      }

      case 'preview_delete': {
        if (!flowId || !previewId) {
          return mcpError(
            new Error('flowId and previewId are required for preview_delete.'),
          );
        }
        const data = await client.deletePreview({
          projectId,
          flowId,
          previewId,
        });
        return mcpResult(data);
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use one of: list, get, create, update, delete, duplicate, preview_list, preview_get, preview_create, preview_delete`,
        );
    }
  } catch (error) {
    return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
  }
}

export function registerFlowManageTool(server: McpServer, client: ToolClient) {
  const spec = createFlowManageToolSpec(client);
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
