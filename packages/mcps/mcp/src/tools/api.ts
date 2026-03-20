import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import {
  whoami,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
  deploy,
  getDeployment,
  listDeployments,
  getDeploymentBySlug,
  createDeployment as createDep,
  deleteDeployment as deleteDep,
} from '@walkeros/cli';
import { mcpResult, mcpError } from '@walkeros/core';
import { ApiOutputShape } from '../schemas/api-output.js';

const ACTIONS = [
  'whoami',
  'project.list',
  'project.get',
  'project.create',
  'project.update',
  'project.delete',
  'flow.list',
  'flow.get',
  'flow.create',
  'flow.update',
  'flow.delete',
  'flow.duplicate',
  'deploy',
  'deployment.get',
  'deployment.list',
  'deployment.create',
  'deployment.delete',
] as const;

export function registerApiTool(server: McpServer) {
  server.registerTool(
    'api',
    {
      title: 'walkerOS Cloud API',
      description:
        'Manage walkerOS cloud projects, flows, and deployments. Requires WALKEROS_TOKEN env var.\n\n' +
        'Actions:\n' +
        '- whoami — verify token, get user info\n' +
        '- project.list/get/create/update/delete — manage projects\n' +
        '- flow.list/get/create/update/delete/duplicate — manage flow configs\n' +
        '- deploy — deploy a flow (auto-detects web/server)\n' +
        '- deployment.get/list/create/delete — manage deployments\n\n' +
        'Parameters vary by action. content = Flow.Config JSON for flow.create/update.',
      inputSchema: {
        action: z.enum(ACTIONS).describe('API action to perform'),
        projectId: z
          .string()
          .optional()
          .describe(
            'Project ID (proj_...). Required for: project.get/update/delete, flow.create, flow.list. ' +
              'Falls back to WALKEROS_PROJECT_ID env var.',
          ),
        flowId: z
          .string()
          .optional()
          .describe(
            'Flow ID (flow_...) or config ID (cfg_...). Required for: ' +
              'flow.get, flow.update, flow.delete, flow.duplicate, deploy. ' +
              'For deployment.get/delete: can be a deployment slug.',
          ),
        name: z
          .string()
          .optional()
          .describe('Name for create/update operations'),
        content: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Flow.Config JSON for flow operations'),
        patch: z
          .boolean()
          .optional()
          .describe('Use merge-patch for flow.update (default: true)'),
        wait: z
          .boolean()
          .optional()
          .describe('Wait for deploy to complete (default: true)'),
        flowName: z
          .string()
          .optional()
          .describe('Flow name for multi-settings flows'),
        fields: z
          .array(z.string())
          .optional()
          .describe('Dot-path field selectors for flow.get'),
        type: z
          .enum(['web', 'server'])
          .optional()
          .describe('Deployment type for deployment.create'),
        sort: z.string().optional().describe('Sort field for list operations'),
        order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
        status: z
          .string()
          .optional()
          .describe('Status filter for deployment.list'),
        includeDeleted: z
          .boolean()
          .optional()
          .describe('Include deleted items in lists'),
      },
      outputSchema: ApiOutputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const {
        action,
        projectId,
        flowId,
        name,
        content,
        patch,
        wait,
        flowName,
        fields,
        type,
        sort,
        order,
        status,
        includeDeleted,
      } = params;

      try {
        let data: unknown;
        let summary: string;

        switch (action) {
          // Auth
          case 'whoami': {
            data = await whoami();
            summary = `Authenticated as ${(data as Record<string, unknown>).email}`;
            break;
          }

          // Projects
          case 'project.list': {
            data = await listProjects();
            summary = `${(((data as Record<string, unknown>).projects as unknown[]) ?? []).length} projects`;
            break;
          }
          case 'project.get': {
            data = await getProject({ projectId });
            summary = `Project "${(data as Record<string, unknown>).name}"`;
            break;
          }
          case 'project.create': {
            if (!name) throw new Error('name required for project.create');
            data = await createProject({ name });
            summary = `Created project "${name}"`;
            break;
          }
          case 'project.update': {
            if (!name) throw new Error('name required for project.update');
            data = await updateProject({ projectId, name });
            summary = `Updated project "${name}"`;
            break;
          }
          case 'project.delete': {
            data = await deleteProject({ projectId });
            summary = `Deleted project ${projectId ?? 'default'}`;
            break;
          }

          // Flows
          case 'flow.list': {
            data = await listFlows({
              projectId,
              sort: sort as 'name' | 'updated_at' | 'created_at' | undefined,
              order: order as 'asc' | 'desc' | undefined,
              includeDeleted,
            });
            summary = `${(((data as Record<string, unknown>).flows as unknown[]) ?? []).length} flows`;
            break;
          }
          case 'flow.get': {
            if (!flowId) throw new Error('flowId required for flow.get');
            data = await getFlow({ flowId, projectId, fields });
            summary = `Flow "${(data as Record<string, unknown>).name}" (${flowId})`;
            break;
          }
          case 'flow.create': {
            if (!name) throw new Error('name required for flow.create');
            if (!content) throw new Error('content required for flow.create');
            data = await createFlow({ name, content, projectId });
            summary = `Created flow "${name}" (${(data as Record<string, unknown>).id})`;
            break;
          }
          case 'flow.update': {
            if (!flowId) throw new Error('flowId required for flow.update');
            data = await updateFlow({
              flowId,
              name,
              content,
              projectId,
              mergePatch: patch ?? true,
            });
            summary = `Updated flow ${flowId}`;
            break;
          }
          case 'flow.delete': {
            if (!flowId) throw new Error('flowId required for flow.delete');
            data = await deleteFlow({ flowId, projectId });
            summary = `Deleted flow ${flowId}`;
            break;
          }
          case 'flow.duplicate': {
            if (!flowId) throw new Error('flowId required for flow.duplicate');
            data = await duplicateFlow({ flowId, name, projectId });
            summary = `Duplicated flow ${flowId}`;
            break;
          }

          // Deploy
          case 'deploy': {
            if (!flowId) throw new Error('flowId required for deploy');
            const progressToken = extra._meta?.progressToken;
            const DEPLOY_TIMEOUT_MS = 90_000;
            const timeoutSignal = AbortSignal.timeout(DEPLOY_TIMEOUT_MS);
            const combinedAbort = new AbortController();
            const onAbort = () => combinedAbort.abort();
            timeoutSignal.addEventListener('abort', onAbort);
            extra.signal?.addEventListener('abort', onAbort);
            data = await deploy({
              flowId,
              projectId,
              wait: wait ?? true,
              flowName,
              timeout: DEPLOY_TIMEOUT_MS,
              onStatus: (s: string, sub: string | null) => {
                if (!progressToken) return;
                const key = sub ? `${s}:${sub}` : s;
                const stages: Record<
                  string,
                  { progress: number; label: string }
                > = {
                  'bundling:building': {
                    progress: 20,
                    label: 'Building bundle...',
                  },
                  'deploying:publishing': {
                    progress: 60,
                    label: 'Publishing to CDN...',
                  },
                  'deploying:provisioning': {
                    progress: 60,
                    label: 'Provisioning container...',
                  },
                  'deploying:starting': {
                    progress: 80,
                    label: 'Starting container...',
                  },
                  published: { progress: 100, label: 'Published' },
                  active: { progress: 100, label: 'Active' },
                  failed: { progress: 100, label: 'Failed' },
                };
                const stage = stages[key] ??
                  stages[s] ?? { progress: 10, label: key };
                extra.sendNotification({
                  method: 'notifications/progress',
                  params: {
                    progressToken,
                    progress: stage.progress,
                    total: 100,
                    message: stage.label,
                  },
                } as ServerNotification);
              },
              signal: combinedAbort.signal,
            });
            timeoutSignal.removeEventListener('abort', onAbort);
            extra.signal?.removeEventListener('abort', onAbort);
            const st = (data as Record<string, unknown>).status;
            const deployData = data as Record<string, unknown>;
            if (st === 'failed') {
              const msg = `Deploy failed: ${deployData.errorMessage ?? 'unknown error'}`;
              return mcpResult({ action, ok: false, data }, msg, {
                next: ['Run flow_validate to check your configuration'],
              });
            } else {
              summary = `Deployed flow ${flowId} — status: ${st}`;
              const publicUrl = deployData.publicUrl as string | undefined;
              const containerUrl = deployData.containerUrl as
                | string
                | undefined;
              const deployType = deployData.type as string | undefined;
              const nextHints: string[] = [];
              if (deployType === 'web' && publicUrl) {
                nextHints.push(`Bundle at ${publicUrl}`);
                nextHints.push(`Add <script src='${publicUrl}'></script>`);
              } else if (deployType === 'server' && containerUrl) {
                nextHints.push(`Container at ${containerUrl}`);
                nextHints.push(`Test: curl ${containerUrl}/health`);
              }
              if (nextHints.length > 0) {
                return mcpResult({ action, ok: true, data }, summary, {
                  next: nextHints,
                });
              }
            }
            break;
          }

          // Deployments
          case 'deployment.get': {
            if (!flowId)
              throw new Error(
                'flowId (flowId or slug) required for deployment.get',
              );
            try {
              data = await getDeployment({ flowId, flowName });
            } catch {
              data = await getDeploymentBySlug({ slug: flowId });
            }
            summary = `Deployment ${(data as Record<string, unknown>).slug ?? flowId} — ${(data as Record<string, unknown>).status}`;
            break;
          }
          case 'deployment.list': {
            data = await listDeployments({
              projectId,
              type: type as 'web' | 'server' | undefined,
              status,
            });
            summary = `${(((data as Record<string, unknown>).deployments as unknown[]) ?? []).length} deployments`;
            break;
          }
          case 'deployment.create': {
            if (!type)
              throw new Error(
                'type (web/server) required for deployment.create',
              );
            data = await createDep({ type, label: name, projectId });
            summary = `Created ${type} deployment ${(data as Record<string, unknown>).slug}`;
            break;
          }
          case 'deployment.delete': {
            if (!flowId)
              throw new Error('flowId (slug) required for deployment.delete');
            data = await deleteDep({ slug: flowId });
            summary = `Deleted deployment ${flowId}`;
            break;
          }

          default:
            throw new Error(
              `Unknown action: ${action}. Use one of: ${ACTIONS.join(', ')}`,
            );
        }

        return mcpResult({ action, ok: true, data }, summary);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        const name = error instanceof Error ? error.name : '';

        // Deploy timeout — return helpful status instead of raw error
        if (
          action === 'deploy' &&
          (name === 'AbortError' ||
            name === 'TimeoutError' ||
            msg.includes('abort'))
        ) {
          return mcpResult(
            {
              action,
              ok: true,
              data: { status: 'deploying', flowId },
            },
            `Deploy in progress (timed out waiting). Use deployment.list with projectId to check status.`,
            {
              next: [
                'Use api(action: "deployment.list") to check current status',
              ],
            },
          );
        }

        if (
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('Unauthorized')
        )
          return mcpError(
            error,
            'Set WALKEROS_TOKEN env var or check token expiry',
          );
        if (msg.includes('required'))
          return mcpError(
            error,
            `See api tool description for ${action} parameters.`,
          );
        return mcpError(error);
      }
    },
  );
}
