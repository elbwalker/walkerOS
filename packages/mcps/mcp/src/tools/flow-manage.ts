import { z } from 'zod';
import {
  listAllFlows,
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
  listPreviews,
  getPreview,
  createPreview,
  deletePreview,
} from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';

export function registerFlowManageTool(server: McpServer) {
  server.registerTool(
    'flow_manage',
    {
      title: 'Flow Management',
      description:
        'Manage walkerOS flows and their previews. List/get/create/update/delete/duplicate flows, or create/inspect/delete preview bundles for testing flow changes on live sites.',
      inputSchema: {
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
      },
      // No outputSchema: action-dispatched tool — each action returns a different shape
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
      previewId,
      flowName,
      flowSettingsId,
      siteUrl,
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

          case 'preview_list': {
            if (!flowId) {
              return mcpError(
                new Error(
                  'flowId is required for preview_list. Use action "list" to see available flows.',
                ),
              );
            }
            const data = await listPreviews({ projectId, flowId });
            return mcpResult(data);
          }

          case 'preview_get': {
            if (!flowId || !previewId) {
              return mcpError(
                new Error('flowId and previewId are required for preview_get.'),
              );
            }
            const data = await getPreview({ projectId, flowId, previewId });
            return mcpResult(data);
          }

          case 'preview_create': {
            if (!flowId) {
              return mcpError(
                new Error('flowId is required for preview_create.'),
              );
            }
            if (!flowName && !flowSettingsId) {
              return mcpError(
                new Error(
                  'flowName or flowSettingsId is required for preview_create.',
                ),
              );
            }
            const preview = await createPreview({
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
                new Error(
                  'flowId and previewId are required for preview_delete.',
                ),
              );
            }
            const data = await deletePreview({
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
    },
  );
}
