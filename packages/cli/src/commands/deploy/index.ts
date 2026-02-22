import { createApiClient } from '../../core/api-client.js';
import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { parseSSEEvents } from '../../core/sse.js';
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
  const configs = (flow as { configs?: Array<{ id: string; name: string }> })
    .configs;
  if (!configs?.length) {
    throw new Error('Flow has no configs.');
  }
  const match = configs.find((c) => c.name === options.flowName);
  if (!match) {
    throw new Error(
      `Flow "${options.flowName}" not found. Available: ${configs.map((c) => c.name).join(', ')}`,
    );
  }
  return match.id;
}

async function getAvailableFlowNames(options: {
  flowId: string;
  projectId: string;
}): Promise<string[]> {
  const flow = await getFlow({
    flowId: options.flowId,
    projectId: options.projectId,
  });
  const configs = (flow as { configs?: Array<{ name: string }> }).configs;
  return configs?.map((c) => c.name) ?? [];
}

// === SSE Streaming ===

interface DeploymentResult {
  status: string;
  substatus?: string | null;
  type?: string;
  containerUrl?: string | null;
  publicUrl?: string | null;
  errorMessage?: string | null;
  [key: string]: unknown;
}

async function streamDeploymentStatus(
  projectId: string,
  deploymentId: string,
  options: {
    timeout?: number;
    signal?: AbortSignal;
    onStatus?: (status: string, substatus: string | null) => void;
  },
): Promise<DeploymentResult> {
  const base = resolveBaseUrl();
  const timeoutMs = options.timeout ?? 120_000;

  const response = await authenticatedFetch(
    `${base}/api/projects/${projectId}/deployments/${deploymentId}/stream`,
    {
      headers: { Accept: 'text/event-stream' },
      signal: options.signal ?? AbortSignal.timeout(timeoutMs),
    },
  );

  if (!response.ok) throw new Error(`Stream failed: ${response.status}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result: DeploymentResult | null = null;
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { parsed, remainder } = parseSSEEvents(buffer);
      buffer = remainder;

      for (const event of parsed) {
        if (event.type === 'status') {
          const data = JSON.parse(event.data);
          result = data;
          options.onStatus?.(data.status, data.substatus ?? null);
        }
        if (event.type === 'done') {
          return result!;
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  if (!result) throw new Error('Stream ended without terminal status');
  return result;
}

// === Programmatic API ===

export interface DeployOptions {
  flowId: string;
  projectId?: string;
  wait?: boolean;
  flowName?: string;
  timeout?: number; // ms, default 120_000
  signal?: AbortSignal;
  onStatus?: (status: string, substatus: string | null) => void;
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
    return deployConfig({
      ...options,
      projectId,
      configId,
      timeout: options.timeout,
      signal: options.signal,
      onStatus: options.onStatus,
    });
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

  // Stream deployment status via SSE
  const result = await streamDeploymentStatus(projectId, data.deploymentId, {
    timeout: options.timeout,
    signal: options.signal,
    onStatus: options.onStatus,
  });

  return { ...data, ...result };
}

// TODO: Replace with typed client.POST() once api.gen.d.ts includes per-config routes
async function deployConfig(options: {
  flowId: string;
  projectId: string;
  configId: string;
  wait?: boolean;
  timeout?: number;
  signal?: AbortSignal;
  onStatus?: (status: string, substatus: string | null) => void;
}) {
  const { flowId, projectId, configId } = options;
  const base = resolveBaseUrl();

  // 1. Trigger per-config deploy
  const response = await authenticatedFetch(
    `${base}/api/projects/${projectId}/flows/${flowId}/configs/${configId}/deploy`,
    { method: 'POST' },
  );
  if (!response.ok) {
    const body: { error?: { message?: string } } = await response
      .json()
      .catch(() => ({}));
    throw new Error(
      body.error?.message || `Deploy failed (${response.status})`,
    );
  }

  const data = await response.json();
  if (!options.wait) return data;

  // 2. Stream deployment status via SSE
  const result = await streamDeploymentStatus(projectId, data.deploymentId, {
    timeout: options.timeout,
    signal: options.signal,
    onStatus: options.onStatus,
  });

  return { ...data, ...result };
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
      const body: { error?: { message?: string } } = await response
        .json()
        .catch(() => ({}));
      throw new Error(body.error?.message || 'Failed to get deployment');
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
  timeout?: string;
  output?: string;
  json?: boolean;
}

const statusLabels: Record<string, string> = {
  bundling: 'Building bundle...',
  'bundling:building': 'Building bundle...',
  'bundling:publishing': 'Publishing to web...',
  deploying: 'Deploying container...',
  'deploying:provisioning': 'Provisioning container...',
  'deploying:starting': 'Starting container...',
  active: 'Container is live',
  published: 'Published',
  failed: 'Deployment failed',
};

export async function deployCommand(
  flowId: string,
  options: DeployCommandOptions,
) {
  const log = createCommandLogger(options);

  const timeoutMs = options.timeout
    ? parseInt(options.timeout, 10) * 1000
    : undefined;

  try {
    const result = await deploy({
      flowId,
      projectId: options.project,
      flowName: options.flow,
      wait: options.wait !== false,
      timeout: timeoutMs,
      onStatus: options.json
        ? undefined
        : (status, substatus) => {
            const key = substatus ? `${status}:${substatus}` : status;
            log.info(
              statusLabels[key] || statusLabels[status] || `Status: ${status}`,
            );
          },
    });

    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
      return;
    }

    const r = result as Record<string, unknown>;

    if (r.status === 'published') {
      log.success(`Published: ${r.publicUrl}`);
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
    if (r.errorMessage) log.error(`Error: ${r.errorMessage}`);
  } catch (err) {
    log.error(err instanceof Error ? err.message : 'Failed to get deployment');
    process.exit(1);
  }
}
