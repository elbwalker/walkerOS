import { getPlatform } from '@walkeros/core';
import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { writeResult } from '../../core/output.js';
import { loadFlowConfig } from '../../config/loader.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export interface ListDeploymentsOptions {
  projectId?: string;
  type?: 'web' | 'server';
  status?: string;
}

export async function listDeployments(options: ListDeploymentsOptions = {}) {
  const id = options.projectId ?? requireProjectId();
  const base = resolveBaseUrl();
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.status) params.set('status', options.status);
  const qs = params.toString();

  const response = await authenticatedFetch(
    `${base}/api/projects/${id}/deployments${qs ? `?${qs}` : ''}`,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ||
        'Failed to list deployments',
    );
  }
  return response.json();
}

export async function getDeploymentBySlug(options: {
  slug: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const base = resolveBaseUrl();

  const response = await authenticatedFetch(
    `${base}/api/projects/${id}/deployments/${options.slug}`,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ||
        'Failed to get deployment',
    );
  }
  return response.json();
}

export async function createDeployment(options: {
  type: 'web' | 'server';
  label?: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const base = resolveBaseUrl();

  const response = await authenticatedFetch(
    `${base}/api/projects/${id}/deployments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: options.type, label: options.label }),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ||
        'Failed to create deployment',
    );
  }
  return response.json();
}

export async function deleteDeployment(options: {
  slug: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const base = resolveBaseUrl();

  const response = await authenticatedFetch(
    `${base}/api/projects/${id}/deployments/${options.slug}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ||
        'Failed to delete deployment',
    );
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
}

async function handleResult(
  fn: () => Promise<unknown>,
  options: DeploymentsCommandOptions,
): Promise<void> {
  const logger = createCLILogger(options);
  try {
    const result = await fn();
    await writeResult(JSON.stringify(result, null, 2), options);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export async function listDeploymentsCommand(
  options: DeploymentsCommandOptions,
): Promise<void> {
  await handleResult(
    () =>
      listDeployments({
        projectId: options.project,
        type: options.type as ListDeploymentsOptions['type'],
        status: options.status,
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
      const base = resolveBaseUrl();
      const resp = await authenticatedFetch(
        `${base}/api/projects/${id}/flows/${config}`,
      );
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } }).error?.message ||
            `Failed to fetch flow ${config}`,
        );
      }
      const flow = (await resp.json()) as { config?: unknown };
      if (!flow.config) throw new Error('Flow has no config');

      const flowConfig = flow.config as { flows?: Record<string, unknown> };
      const flows = flowConfig.flows;
      if (!flows) throw new Error('Invalid flow config: missing flows');
      const flowName = options.flow ?? Object.keys(flows)[0];
      if (!flowName) throw new Error('No flows found in config');
      const flowSettings = flows[flowName];
      if (!flowSettings || typeof flowSettings !== 'object')
        throw new Error('Invalid flow config');

      if ('web' in flowSettings) type = 'web';
      else if ('server' in flowSettings) type = 'server';
      else throw new Error('Flow must have "web" or "server" key');
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

    // Human-readable output
    log.info(`Deployment created: ${result.id}`);
    log.info(`  Slug:  ${result.slug}`);
    log.info(`  Type:  ${result.type}`);
    if (result.deployToken) {
      log.info(`  Token: ${result.deployToken}`);
      log.warn('  Save this token — it will not be shown again.');
    }
    log.info('');
    log.info('Run locally:');
    log.info(
      `  walkeros run ${isRemoteFlow ? 'flow.json' : config} --deploy ${result.id}`,
    );
    log.info('');
    log.info('Docker:');
    log.info(
      `  docker run -e WALKEROS_DEPLOY_TOKEN=${result.deployToken ?? '<token>'} \\`,
    );
    log.info('             -e WALKEROS_APP_URL=https://app.walkeros.io \\');
    log.info('             walkeros/flow:latest');
  } catch (err) {
    log.error(
      err instanceof Error ? err.message : 'Failed to create deployment',
    );
    process.exit(1);
  }
}
