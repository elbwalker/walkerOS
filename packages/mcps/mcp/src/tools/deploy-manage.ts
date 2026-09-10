import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import { redactDisplayNames } from '../user-data.js';
import { links } from '../links.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  resolveDeploymentSlug,
  type DeploymentSummaryForResolver,
  type ListDeploymentsForResolver,
} from './_resolvers.js';
import { resolveDefaultProject } from './project-context.js';
import {
  validateActionInput,
  assertParam,
  DEPLOY_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';

const TITLE = 'Deploy Management';
const DESCRIPTION =
  'Deploy walkerOS flows and manage deployments. ' +
  'deploy waits for the deployment to reach a terminal status by default (wait=true), with a 12-minute budget; pass wait=false to return immediately with the deployment id. ' +
  'A finished deployment carries its status and, on failure, an errorMessage with the user-facing reason; use the get action to re-read it. ' +
  'list supports cursor and limit for pagination. ' +
  'delete removes an active deployment. ' +
  'For get and delete pass flowId (required) plus optional slug to disambiguate when a flow has multiple active deployments. ' +
  "If a flow has >=2 active deployments and no slug is supplied, the tool returns a MULTIPLE_DEPLOYMENTS error with a details[] list showing each deployment's slug, type, status, and updatedAt.";

const inputSchema = {
  action: z
    .enum(['deploy', 'list', 'get', 'delete'])
    .describe('Deployment action to perform'),
  projectId: z
    .string()
    .optional()
    .describe('Project ID. Optional; falls back to the default project.'),
  flowId: z.string().optional().describe('Required for deploy, get, delete.'),
  slug: z
    .string()
    .optional()
    .describe(
      'Deployment slug. Optional disambiguator for get/delete when the flow has multiple active deployments.',
    ),
  type: z
    .enum(['web', 'server'])
    .optional()
    .describe('Deployment type filter for list.'),
  status: z.string().optional().describe('Status filter for list.'),
  wait: z
    .boolean()
    .optional()
    .describe(
      'Wait for the deployment to reach a terminal status (default true), with a 12-minute budget. Set false to return the deployment id immediately. Only used with deploy action.',
    ),
  flowName: z
    .string()
    .optional()
    .describe(
      'Flow name for multi-settings flows. Only used with deploy action.',
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

/**
 * The deployment's ID, however the response spells it: the deploy start body
 * carries `deploymentId`, the detail read carries `id`.
 *
 * The `slug` both bodies also carry is deliberately NOT an address here. The
 * detail route resolves a slug, but the page's live-status stream matches on
 * the id alone, so a slug link opens a page whose status stream fails on a
 * deployment that is still deploying. A response carrying neither id spelling
 * gets no link.
 */
function deploymentAddress(data: unknown): string | undefined {
  if (data === null || typeof data !== 'object' || Array.isArray(data))
    return undefined;
  const record: Record<string, unknown> = { ...data };
  for (const key of ['id', 'deploymentId']) {
    const value = record[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

/**
 * The deployment's page in the app.
 *
 * The project is resolved the way every other project-bound tool resolves it,
 * falling back to the door's default. That fallback is for the LINK only:
 * nothing here changes which project the call itself reads, and a door with no
 * default simply yields no link rather than a wrong one.
 */
function deploymentUrl(
  client: ToolClient,
  projectId: string | undefined,
  data: unknown,
): string | undefined {
  const resolvedProjectId = resolveDefaultProject(client, projectId);
  if (resolvedProjectId === undefined) return undefined;
  const deploymentId = deploymentAddress(data);
  if (deploymentId === undefined) return undefined;
  return links.deployment({
    baseUrl: client.appBaseUrl(),
    projectId: resolvedProjectId,
    deploymentId,
  });
}

/**
 * Attach the link to a response body without disturbing what it already
 * carries.
 *
 * The key is `appUrl`, and it may never be `url`. A deployment response
 * ALREADY carries `url`, and it means where this deployment is SERVING: the
 * app sets it to the deployment's target while published or active. Writing
 * the app page over it would silently replace a live endpoint with a UI link,
 * with nothing to signal that the meaning of the field had changed. `appUrl`
 * also names the `appBaseUrl()` seam it is built from.
 *
 * A non-object body (nothing the app returns today, but the client types are
 * `unknown`) is passed through untouched rather than wrapped.
 */
function withAppUrl(data: unknown, appUrl: string | undefined): unknown {
  if (
    appUrl === undefined ||
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    return data;
  }
  return { ...data, appUrl };
}

function listForResolver(
  client: ToolClient,
  projectId: string | undefined,
): ListDeploymentsForResolver {
  return async (q) => {
    const resp = (await client.listDeployments({
      projectId: projectId || q.projectId || undefined,
      flowId: q.flowId,
    })) as { deployments?: DeploymentSummaryForResolver[] };
    return resp.deployments ?? [];
  };
}

export function createDeployManageToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'deploy_manage',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => deployManageHandlerBody(client, input),
  };
}

async function deployManageHandlerBody(client: ToolClient, input: unknown) {
  const {
    action,
    projectId,
    flowId,
    slug,
    type,
    status,
    wait,
    flowName,
    cursor,
    limit,
  } = (input ?? {}) as {
    action?: 'deploy' | 'list' | 'get' | 'delete';
    projectId?: string;
    flowId?: string;
    slug?: string;
    type?: 'web' | 'server';
    status?: string;
    wait?: boolean;
    flowName?: string;
    cursor?: string;
    limit?: number;
  };
  const validationError = validateActionInput(
    'deploy_manage',
    action ?? '',
    { flowId, projectId },
    DEPLOY_MANAGE_REQUIREMENTS,
  );
  if (validationError) return mcpError(new Error(validationError));
  try {
    switch (action) {
      case 'deploy': {
        assertParam(flowId, 'flowId', 'deploy');
        // `projectId` travels with the deploy itself, not just with the link.
        // Without it the deploy resolved the door's default while the link
        // resolved the explicit id, so an explicit projectId that differed
        // from the default deployed in one project and linked into another,
        // and the project-scoped deployment route answered that link with a
        // 404.
        const result = await client.deploy({
          flowId,
          projectId,
          wait: wait ?? true,
          flowName,
        });
        // The deployment's own page, whether this call waited for a terminal
        // status or returned the id straight away. It is where the status the
        // hint tells the agent to re-read is shown, so the person can watch it
        // instead of asking again.
        const appUrl = deploymentUrl(client, projectId, result);
        return mcpResult(withAppUrl(redactDisplayNames(result), appUrl), {
          next: [
            'Use deploy_manage with action "get" to check deployment status',
          ],
        });
      }

      case 'list': {
        const data = await client.listDeployments({
          projectId,
          flowId,
          type,
          status,
          cursor,
          limit,
        });
        return mcpResult(redactDisplayNames(data));
      }

      case 'get': {
        assertParam(flowId, 'flowId', 'get');
        const resolvedSlug = await resolveDeploymentSlug({
          projectId: projectId ?? '',
          flowId,
          slug,
          list: listForResolver(client, projectId),
        });
        const data = await client.getDeploymentBySlug({
          slug: resolvedSlug,
          projectId,
        });
        const appUrl = deploymentUrl(client, projectId, data);
        return mcpResult(withAppUrl(redactDisplayNames(data), appUrl));
      }

      case 'delete': {
        assertParam(flowId, 'flowId', 'delete');
        const resolvedSlug = await resolveDeploymentSlug({
          projectId: projectId ?? '',
          flowId,
          slug,
          list: listForResolver(client, projectId),
        });
        const data = await client.deleteDeployment({
          slug: resolvedSlug,
          projectId,
        });
        return mcpResult(
          redactDisplayNames({
            deleted: true,
            ...(data as Record<string, unknown>),
          }),
        );
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use one of: deploy, list, get, delete`,
        );
    }
  } catch (error) {
    return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
  }
}

export function registerDeployTool(server: McpServer, client: ToolClient) {
  const spec = createDeployManageToolSpec(client);
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
