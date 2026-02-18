import { createApiClient } from '../../core/api-client.js';
import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';
import { getFlow } from '../flows/index.js';

// === Helpers ===

async function resolveConfigId(options: {
  flowId: string;
  projectId: string;
  flowName: string;
}): Promise<string> {
  const flow = await getFlow({
    flowId: options.flowId,
    projectId: options.projectId,
  });
  const content = flow.content as { flows?: Record<string, unknown> };
  const flowNames = Object.keys(content.flows ?? {});
  if (!flowNames.includes(options.flowName)) {
    throw new Error(
      `Flow "${options.flowName}" not found. Available: ${flowNames.join(', ')}`,
    );
  }
  return options.flowName;
}

async function getAvailableFlowNames(options: {
  flowId: string;
  projectId: string;
}): Promise<string[]> {
  const flow = await getFlow({
    flowId: options.flowId,
    projectId: options.projectId,
  });
  const content = flow.content as { flows?: Record<string, unknown> };
  return Object.keys(content.flows ?? {});
}

// === Programmatic API ===

export interface DeployOptions {
  flowId: string;
  projectId?: string;
  wait?: boolean;
  flowName?: string;
}

export async function deploy(options: DeployOptions) {
  const projectId = options.projectId ?? requireProjectId();
  const client = createApiClient();

  if (options.flowName) {
    const configId = await resolveConfigId({
      flowId: options.flowId,
      projectId,
      flowName: options.flowName,
    });
    return deployConfig({ ...options, projectId, configId });
  }

  // Legacy path
  const { data, error } = await client.POST(
    '/api/projects/{projectId}/flows/{flowId}/deploy',
    { params: { path: { projectId, flowId: options.flowId } } },
  );

  if (error) {
    const msg = error.error?.message || 'Failed to start deployment';
    const code = error.error?.code;
    if (code === 'AMBIGUOUS_CONFIG') {
      const names = await getAvailableFlowNames({
        flowId: options.flowId,
        projectId,
      });
      throw new Error(
        `This flow has multiple configs. Use --flow <name> to specify one.\n` +
          `Available: ${names.join(', ')}`,
      );
    }
    throw new Error(msg);
  }

  if (!options.wait) return data;

  // Poll /advance until terminal
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

// TODO: Replace with typed client.POST() once api.gen.d.ts includes per-config routes
async function deployConfig(options: {
  flowId: string;
  projectId: string;
  configId: string;
  wait?: boolean;
}) {
  const { flowId, projectId, configId } = options;
  const base = resolveBaseUrl();

  // 1. Trigger per-config deploy
  const response = await authenticatedFetch(
    `${base}/api/projects/${projectId}/flows/${flowId}/configs/${configId}/deploy`,
    { method: 'POST' },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as any)?.error?.message || `Deploy failed (${response.status})`,
    );
  }

  const data = await response.json();
  if (!options.wait) return data;

  // 2. Poll per-config advance
  const terminalStatuses = ['active', 'published', 'failed', 'deleted'];
  let status = data.status;
  let result: Record<string, unknown> = { ...data };

  while (!terminalStatuses.includes(status)) {
    await new Promise((r) => setTimeout(r, 3000));
    const advResponse = await authenticatedFetch(
      `${base}/api/projects/${projectId}/flows/${flowId}/configs/${configId}/deployments/${data.deploymentId}/advance`,
      { method: 'POST' },
    );
    if (!advResponse.ok) {
      const body = await advResponse.json().catch(() => ({}));
      throw new Error(
        (body as any)?.error?.message || 'Failed to advance deployment',
      );
    }
    const advanced = await advResponse.json();
    status = advanced.status;
    result = { ...advanced };
  }

  return result;
}

export async function getDeployment(options: {
  flowId: string;
  projectId?: string;
  flowName?: string;
}) {
  const projectId = options.projectId ?? requireProjectId();

  if (options.flowName) {
    const configId = await resolveConfigId({
      flowId: options.flowId,
      projectId,
      flowName: options.flowName,
    });
    const base = resolveBaseUrl();
    const response = await authenticatedFetch(
      `${base}/api/projects/${projectId}/flows/${options.flowId}/configs/${configId}/deploy`,
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as any)?.error?.message || 'Failed to get deployment',
      );
    }
    return response.json();
  }

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
  flow?: string;
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
      flowName: options.flow,
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
      flowName: options.flow,
    });

    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
      return;
    }

    if (!result) {
      log.info('No deployment found');
      return;
    }

    const r = result as Record<string, unknown>;
    log.info(`Deployment: ${r.id}`);
    log.info(`Type: ${r.type}`);
    log.info(`Status: ${r.status}`);
    if (r.containerUrl) log.info(`Endpoint: ${r.containerUrl}`);
    if (r.publicUrl) log.info(`URL: ${r.publicUrl}`);
    if (r.scriptTag) log.info(`Script tag: ${r.scriptTag}`);
    if (r.errorMessage) log.error(`Error: ${r.errorMessage}`);
  } catch (err) {
    log.error(err instanceof Error ? err.message : 'Failed to get deployment');
    process.exit(1);
  }
}
