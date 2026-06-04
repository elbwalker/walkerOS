import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import {
  wrapUserData,
  redactNestedStrings,
  keepStructural,
} from '../user-data.js';
import { flowCanvasResult } from '../ui-parts.js';

/** Peek at a Flow.Json root (v4) and decide whether the bubble should render
 *  as web-flavoured or server-flavoured. The platform is recorded on
 *  `flows[name].config.platform`. We pick the first flow's platform; if no
 *  platform is set we fall back to `'server'` so the chat bubble can still
 *  render even if the user is mid-edit. */
function pickPlatform(content: unknown): 'web' | 'server' {
  if (content && typeof content === 'object') {
    const flows = (content as { flows?: unknown }).flows;
    if (flows && typeof flows === 'object') {
      for (const flow of Object.values(flows as Record<string, unknown>)) {
        if (flow && typeof flow === 'object') {
          const config = (flow as { config?: unknown }).config;
          if (config && typeof config === 'object') {
            const platform = (config as { platform?: unknown }).platform;
            if (platform === 'web' || platform === 'server') return platform;
          }
        }
      }
    }
  }
  return 'server';
}

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  validateActionInput,
  assertParam,
  FLOW_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';
import {
  NO_DEFAULT_PROJECT_ERROR,
  resolveDefaultProject,
} from './project-context.js';

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
      { skip: keepStructural },
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
      'Flow ID (flow_...) or config ID (cfg_...). Required for get, update, delete, duplicate, preview_list, preview_get, preview_create, preview_delete.',
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
    .describe('Flow.Json content. Used for create and update.'),
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
  previewId: z
    .string()
    .optional()
    .describe(
      'Preview ID (prv_...). Required for preview_get and preview_delete (both also require flowId).',
    ),
  flowName: z
    .string()
    .optional()
    .describe(
      'Used by preview_create — provide one of flowName or flowSettingsId (preview_create also requires flowId).',
    ),
  flowSettingsId: z
    .string()
    .optional()
    .describe(
      'Used by preview_create — provide one of flowName or flowSettingsId (preview_create also requires flowId).',
    ),
  source: z
    .discriminatedUnion('kind', [
      z.object({ kind: z.literal('draft') }),
      z.object({
        kind: z.literal('deployment-version'),
        deploymentVersionId: z.string(),
      }),
    ])
    .optional()
    .describe(
      "What the preview should run, for preview_create: the flow's draft (default) or a deployed version's stored config (kind 'deployment-version' with its deploymentVersionId).",
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
    cursor,
    limit,
    previewId,
    flowName,
    flowSettingsId,
    source,
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
    cursor?: string;
    limit?: number;
    previewId?: string;
    flowName?: string;
    flowSettingsId?: string;
    source?:
      | { kind: 'draft' }
      | { kind: 'deployment-version'; deploymentVersionId: string };
    siteUrl?: string;
  };
  const validationError = validateActionInput(
    'flow_manage',
    action ?? '',
    { flowId, projectId, name, previewId, flowName, flowSettingsId },
    FLOW_MANAGE_REQUIREMENTS,
  );
  if (validationError) return mcpError(new Error(validationError));
  try {
    switch (action) {
      case 'list': {
        if (projectId) {
          const data = await client.listFlows({
            projectId,
            sort,
            order,
            includeDeleted,
            cursor,
            limit,
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
          cursor,
          limit,
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
        assertParam(flowId, 'flowId', 'get');
        const resolvedProjectId = resolveDefaultProject(client, projectId);
        if (!resolvedProjectId) {
          return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));
        }
        const flow = await client.getFlow({
          flowId,
          projectId: resolvedProjectId,
          fields,
        });
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
          flowConfig: safe.config ?? {},
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
        assertParam(name, 'name', 'create');
        const resolvedProjectId = resolveDefaultProject(client, projectId);
        if (!resolvedProjectId) {
          return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));
        }
        const created = await client.createFlow({
          name,
          content: content ?? {},
          projectId: resolvedProjectId,
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
          flowConfig: safeCreated.config ?? {},
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
        assertParam(flowId, 'flowId', 'update');
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
          flowConfig: safeUpdated.config ?? {},
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
        assertParam(flowId, 'flowId', 'delete');
        const deleted = await client.deleteFlow({ flowId, projectId });
        return mcpResult(deleted);
      }

      case 'duplicate': {
        assertParam(flowId, 'flowId', 'duplicate');
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
        assertParam(flowId, 'flowId', 'preview_list');
        const resolvedProjectId = resolveDefaultProject(client, projectId);
        if (!resolvedProjectId) {
          return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));
        }
        const data = await client.listPreviews({
          projectId: resolvedProjectId,
          flowId,
        });
        return mcpResult(data);
      }

      case 'preview_get': {
        assertParam(flowId, 'flowId', 'preview_get');
        assertParam(previewId, 'previewId', 'preview_get');
        const data = await client.getPreview({
          projectId,
          flowId,
          previewId,
        });
        return mcpResult(data);
      }

      case 'preview_create': {
        assertParam(flowId, 'flowId', 'preview_create');
        const resolvedProjectId = resolveDefaultProject(client, projectId);
        if (!resolvedProjectId) {
          return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));
        }
        const preview = await client.createPreview({
          projectId: resolvedProjectId,
          flowId,
          flowName,
          flowSettingsId,
          ...(source ? { source } : {}),
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
        assertParam(flowId, 'flowId', 'preview_delete');
        assertParam(previewId, 'previewId', 'preview_delete');
        const data = await client.deletePreview({
          projectId,
          flowId,
          previewId,
        });
        // The app responds 204 No Content; an older CLI maps that to null.
        // mcpResult requires a record for structuredContent, so synthesize a
        // confirmation when the body is empty.
        return mcpResult(
          data && typeof data === 'object'
            ? data
            : { deleted: true, previewId },
        );
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
