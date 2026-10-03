import { getPlatform, isObject } from '@walkeros/core';
import { requireProjectId } from '../../core/auth.js';
import { apiRequest } from '../../core/api-request.js';
import type { ApiRequestInit, ResponseJson } from '../../core/api-request.js';
import { handleCliError, throwApiError } from '../../core/api-error.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { writeResult } from '../../core/output.js';
import { resolveAppUrl } from '../../lib/config-file.js';
import { VERSION } from '../../version.js';
import { loadFlowConfig } from '../../config/loader.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

type ListDeploymentsQuery = NonNullable<
  ApiRequestInit<'GET /api/projects/{projectId}/deployments'>['query']
>;

/** A deployment status, as the contract's list filter declares it. */
export type DeploymentStatus = NonNullable<ListDeploymentsQuery['status']>;

/** A deployment type, as the contract's list filter declares it. */
export type DeploymentType = NonNullable<ListDeploymentsQuery['type']>;

/** Every deployment status. The compiler holds it equal to the contract's. */
export const DEPLOYMENT_STATUSES = {
  idle: true,
  deploying: true,
  published: true,
  active: true,
  stopped: true,
  failed: true,
} satisfies Record<DeploymentStatus, true>;

/** Every deployment type. The compiler holds it equal to the contract's. */
export const DEPLOYMENT_TYPES = {
  web: true,
  server: true,
} satisfies Record<DeploymentType, true>;

function isMember<T extends string>(
  members: Readonly<Record<T, true>>,
  value: string,
): value is T {
  return Object.hasOwn(members, value);
}

export function isDeploymentStatus(value: string): value is DeploymentStatus {
  return isMember(DEPLOYMENT_STATUSES, value);
}

export interface ListDeploymentsOptions {
  projectId?: string;
  type?: DeploymentType;
  status?: DeploymentStatus;
  flowId?: string;
  cursor?: string;
  limit?: number;
}

export async function listDeployments(options: ListDeploymentsOptions = {}) {
  const id = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'GET /api/projects/{projectId}/deployments',
    {
      path: { projectId: id },
      query: {
        type: options.type,
        status: options.status,
        flowId: options.flowId || undefined,
        cursor: options.cursor || undefined,
        limit: options.limit,
      },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to list deployments');
  }
  return response.json();
}

/**
 * Summary of an active deployment returned by listDeployments, used when
 * disambiguating which deployment to operate on for a given flow.
 */
export interface DeploymentSummaryForFlow {
  slug: string;
  type: string;
  status: string;
  updatedAt: string;
}

/**
 * Error thrown by deleteDeploymentByFlowId and other flow-scoped helpers when
 * the flow has multiple active (non-deleted) deployments and the caller did
 * not disambiguate with an explicit slug.
 *
 * Callers (e.g. the MCP layer) can translate this into a structured error.
 * The CLI package does not depend on MCP helpers.
 */
export class DeploymentAmbiguityError extends Error {
  readonly code = 'MULTIPLE_DEPLOYMENTS';
  readonly details: DeploymentSummaryForFlow[];
  constructor(message: string, details: DeploymentSummaryForFlow[]) {
    super(message);
    this.name = 'DeploymentAmbiguityError';
    this.details = details;
  }
}

/**
 * Delete a deployment identified by flowId, optionally disambiguated by slug
 * when the flow has more than one active deployment. Throws
 * DeploymentAmbiguityError when the flow has >= 2 active deployments and no
 * slug is provided. Throws a plain Error when the flow has no matches or when
 * a provided slug does not belong to the flow.
 */
export async function deleteDeploymentByFlowId(options: {
  projectId?: string;
  flowId: string;
  slug?: string;
}): Promise<unknown> {
  const { flowId, slug } = options;
  const projectId = options.projectId ?? requireProjectId();

  const listResp = (await listDeployments({ projectId, flowId })) as {
    deployments?: DeploymentSummaryForFlow[];
  };
  const matches = listResp.deployments ?? [];

  if (matches.length === 0) {
    throw new Error(`No deployments found for flow ${flowId}`);
  }

  if (slug !== undefined) {
    const hit = matches.find((m) => m.slug === slug);
    if (!hit) {
      throw new Error(`No deployment with slug ${slug} in flow ${flowId}`);
    }
    return deleteDeployment({ slug: hit.slug, projectId });
  }

  if (matches.length > 1) {
    throw new DeploymentAmbiguityError(
      `Flow ${flowId} has ${matches.length} active deployments; pass slug to disambiguate`,
      matches.map((m) => ({
        slug: m.slug,
        type: m.type,
        status: m.status,
        updatedAt: m.updatedAt,
      })),
    );
  }
  return deleteDeployment({ slug: matches[0].slug, projectId });
}

export async function getDeploymentBySlug(options: {
  slug: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();

  const response = await apiRequest(
    'GET /api/projects/{projectId}/deployments/{deploymentId}',
    { path: { projectId: id, deploymentId: options.slug } },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to get deployment');
  }
  return response.json();
}

export async function createDeployment(options: {
  type: 'web' | 'server';
  label?: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();

  const response = await apiRequest(
    'POST /api/projects/{projectId}/deployments',
    {
      path: { projectId: id },
      body: { type: options.type, label: options.label },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to create deployment');
  }
  return response.json();
}

export async function deleteDeployment(options: {
  slug: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();

  const response = await apiRequest(
    'DELETE /api/projects/{projectId}/deployments/{deploymentId}',
    { path: { projectId: id, deploymentId: options.slug } },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to delete deployment');
  }
  const data = await response.json().catch(() => null);
  return data ?? { success: true };
}

// === CLI Command Handlers ===

interface DeploymentsCommandOptions extends GlobalOptions {
  json?: boolean;
  output?: string;
  project?: string;
  type?: string;
  status?: string;
  label?: string;
  cursor?: string;
  limit?: number;
}

/** A flag's value narrowed to its members; any other value is an error. */
function flagValue<T extends string>(
  flag: string,
  value: string | undefined,
  members: Readonly<Record<T, true>>,
): T | undefined {
  if (value === undefined) return undefined;
  if (isMember(members, value)) return value;
  throw new Error(`${flag} must be one of: ${Object.keys(members).join(', ')}`);
}

async function handleResult(
  fn: () => Promise<unknown>,
  options: DeploymentsCommandOptions,
): Promise<void> {
  try {
    const result = await fn();
    await writeResult(JSON.stringify(result, null, 2), options);
  } catch (error) {
    handleCliError(error);
  }
}

export async function listDeploymentsCommand(
  options: DeploymentsCommandOptions,
): Promise<void> {
  await handleResult(
    () =>
      listDeployments({
        projectId: options.project,
        type: flagValue('--type', options.type, DEPLOYMENT_TYPES),
        status: flagValue('--status', options.status, DEPLOYMENT_STATUSES),
        cursor: options.cursor,
        limit: options.limit,
      }),
    options,
  );
}

export async function getDeploymentBySlugCommand(
  slug: string,
  options: DeploymentsCommandOptions,
): Promise<void> {
  await handleResult(
    () => getDeploymentBySlug({ slug, projectId: options.project }),
    options,
  );
}

export async function createDeploymentCommand(
  options: DeploymentsCommandOptions,
): Promise<void> {
  await handleResult(
    () =>
      createDeployment({
        type: options.type as 'web' | 'server',
        label: options.label,
        projectId: options.project,
      }),
    options,
  );
}

export async function deleteDeploymentCommand(
  slug: string,
  options: DeploymentsCommandOptions,
): Promise<void> {
  await handleResult(
    () => deleteDeployment({ slug, projectId: options.project }),
    options,
  );
}

export async function createDeployCommand(
  config: string | undefined,
  options: DeploymentsCommandOptions & { flow?: string },
): Promise<void> {
  const log = createCLILogger(options);

  try {
    let type: 'web' | 'server';

    if (!config) {
      log.error(
        'Config required. Provide a flow config file or remote flow ID (cfg_xxx).',
      );
      process.exit(1);
    }

    // Detect: local file path vs remote flow ID
    const isRemoteFlow = config.startsWith('cfg_');

    if (isRemoteFlow) {
      // Fetch flow from API to determine type
      const id = options.project ?? requireProjectId();
      const resp = await apiRequest(
        'GET /api/projects/{projectId}/flows/{flowId}',
        { path: { projectId: id, flowId: config } },
      );
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throwApiError(body, `Failed to fetch flow ${config}`);
      }
      const flow: ResponseJson<
        'GET /api/projects/{projectId}/flows/{flowId}',
        200
      > = await resp.json();
      if (!flow.config) throw new Error('Flow has no config');

      const flows = flow.config.flows;
      if (!flows) throw new Error('Invalid flow config: missing flows');
      const flowName = options.flow ?? Object.keys(flows)[0];
      if (!flowName) throw new Error('No flows found in config');
      const flowSettings = flows[flowName];
      if (!isObject(flowSettings)) throw new Error('Invalid flow config');

      // A v4 flow declares its platform at flows.<name>.config.platform.
      const platform = isObject(flowSettings.config)
        ? flowSettings.config.platform
        : undefined;
      if (platform !== 'web' && platform !== 'server')
        throw new Error(
          `Flow "${flowName}" must have config.platform set to "web" or "server"`,
        );
      type = platform;
    } else {
      // Local file: use config loader + core getPlatform
      const result = await loadFlowConfig(config, {
        flowName: options.flow,
      });
      type = getPlatform(result.flowSettings);
    }

    // Create deployment via API
    const deployment = await createDeployment({
      type,
      label: options.label,
      projectId: options.project,
    });

    const result = deployment as Record<string, unknown>;

    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
      return;
    }

    // Human-readable output. The create-deployment response does not include a
    // deploy token: tokens are minted separately (admin-only) and never stored
    // in plaintext, so we point the user at creating one rather than printing a
    // missing field.
    log.info(`Deployment created: ${result.id}`);
    log.info(`  Slug:  ${result.slug}`);
    log.info(`  Type:  ${result.type}`);

    if (type === 'server') {
      for (const line of selfHostServerHint({
        config: isRemoteFlow ? 'flow.json' : config,
        flowId: isRemoteFlow ? config : undefined,
        projectId: options.project ?? requireProjectId(),
        deploymentId: String(result.id),
        appUrl: resolveAppUrl(),
        version: VERSION,
      }))
        log.info(line);
    }
  } catch (err) {
    handleCliError(err);
  }
}

/**
 * The self-host instructions for a server deployment: build `dist/` with the
 * CLI, then run it in the `walkeros/flow` image (or with `runneros`) pinned to
 * this CLI's version. Mirrors the app's self-hosted command: the whole `dist/`
 * directory mounted at `/app/flow`, the token passed through from the shell,
 * and the project, flow and deployment ids the heartbeat needs.
 * Keep in step with the app's CI-executed source of this shape,
 * `components/src/flow/deploy/self-host-command.ts` (a copy, not an import:
 * public packages never depend on the app).
 */
export function selfHostServerHint(input: {
  config: string;
  /** Known for a remote flow; a local config prints a placeholder. */
  flowId?: string;
  projectId: string;
  deploymentId: string;
  appUrl: string;
  version: string;
}): string[] {
  const env: Array<[string, string]> = [
    ['WALKEROS_PROJECT_ID', input.projectId],
    ['WALKEROS_FLOW_ID', input.flowId ?? '<your-flow-id>'],
    ['WALKEROS_DEPLOYMENT_ID', input.deploymentId],
    ['WALKEROS_APP_URL', input.appUrl],
  ];
  return [
    '',
    'Create a deploy token for this flow in the app',
    '(Settings, Self-hosted deploy token) and export it as',
    'WALKEROS_DEPLOY_TOKEN. Then build and run it with Docker:',
    `  walkeros bundle ${input.config} -o dist/`,
    '  docker run --rm -p 8080:8080 \\',
    '    -v "$PWD/dist:/app/flow:ro" \\',
    '    -e WALKEROS_DEPLOY_TOKEN \\',
    ...env.map(([name, value]) => `    -e ${name}="${value}" \\`),
    `    walkeros/flow:${input.version}`,
    '',
    'Or run the built flow with Node, with the same variables exported:',
    `  npx --yes --package=@walkeros/runner@${input.version} runneros start dist/flow.mjs`,
  ];
}
