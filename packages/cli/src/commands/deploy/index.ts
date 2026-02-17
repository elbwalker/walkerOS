import { createApiClient } from '../../core/api-client.js';
import { requireProjectId } from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export interface DeployOptions {
  flowId: string;
  projectId?: string;
  wait?: boolean;
}

export async function deploy(options: DeployOptions) {
  const projectId = options.projectId ?? requireProjectId();
  const client = createApiClient();

  // 1. Trigger deploy
  const { data, error } = await client.POST(
    '/api/projects/{projectId}/flows/{flowId}/deploy',
    { params: { path: { projectId, flowId: options.flowId } } },
  );
  if (error)
    throw new Error(error.error?.message || 'Failed to start deployment');

  if (!options.wait) return data;

  // 2. Poll /advance until terminal
  const terminalStatuses = ['active', 'published', 'failed', 'deleted'];
  let status = data.status;
  let result: Record<string, unknown> = { ...data };

  while (!terminalStatuses.includes(status)) {
    await new Promise((r) => setTimeout(r, 3000));

    const { data: advanced, error: advanceError } = await client.POST(
      '/api/projects/{projectId}/flows/{flowId}/deploy/{deploymentId}/advance',
      {
        params: {
          path: {
            projectId,
            flowId: options.flowId,
            deploymentId: data.deploymentId,
          },
        },
      },
    );

    if (advanceError)
      throw new Error(
        advanceError.error?.message || 'Failed to advance deployment',
      );
    if (advanced) {
      status = advanced.status;
      result = { ...advanced };
    }
  }

  return result;
}

export async function getDeployment(options: {
  flowId: string;
  projectId?: string;
}) {
  const projectId = options.projectId ?? requireProjectId();
  const client = createApiClient();

  const { data, error } = await client.GET(
    '/api/projects/{projectId}/flows/{flowId}/deploy',
    { params: { path: { projectId, flowId: options.flowId } } },
  );
  if (error)
    throw new Error(error.error?.message || 'Failed to get deployment');
  return data;
}

// === CLI Commands ===

interface DeployCommandOptions extends GlobalOptions {
  project?: string;
  wait?: boolean;
  output?: string;
  json?: boolean;
}

export async function deployCommand(
  flowId: string,
  options: DeployCommandOptions,
) {
  const log = createCommandLogger(options);

  try {
    const result = await deploy({
      flowId,
      projectId: options.project,
      wait: options.wait !== false,
    });

    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
      return;
    }

    const r = result as Record<string, unknown>;

    if (r.status === 'published') {
      log.success(`Published: ${r.publicUrl}`);
      if (r.scriptTag) log.info(`Script tag: ${r.scriptTag}`);
    } else if (r.status === 'active') {
      log.success(`Active: ${r.containerUrl}`);
    } else if (r.status === 'failed') {
      log.error(`Failed: ${r.errorMessage || 'Unknown error'}`);
      process.exit(1);
    } else if (r.status === 'bundling') {
      log.info(`Deployment started: ${r.deploymentId} (${r.type})`);
    } else {
      log.info(`Status: ${r.status}`);
    }
  } catch (err) {
    log.error(err instanceof Error ? err.message : 'Deploy failed');
    process.exit(1);
  }
}

export async function getDeploymentCommand(
  flowId: string,
  options: DeployCommandOptions,
) {
  const log = createCommandLogger(options);

  try {
    const result = await getDeployment({
      flowId,
      projectId: options.project,
    });

    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
      return;
    }

    if (!result) {
      log.info('No deployment found');
      return;
    }

    log.info(`Deployment: ${result.id}`);
    log.info(`Type: ${result.type}`);
    log.info(`Status: ${result.status}`);
    if (result.containerUrl) log.info(`Endpoint: ${result.containerUrl}`);
    if (result.publicUrl) log.info(`URL: ${result.publicUrl}`);
    if (result.scriptTag) log.info(`Script tag: ${result.scriptTag}`);
    if (result.errorMessage) log.error(`Error: ${result.errorMessage}`);
  } catch (err) {
    log.error(err instanceof Error ? err.message : 'Failed to get deployment');
    process.exit(1);
  }
}
