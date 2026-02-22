import fs from 'fs-extra';
import path from 'path';
import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import { streamDeploymentStatus } from '../deploy/index.js';
import type { GlobalOptions } from '../../types/global.js';

// === Helpers ===

async function readConfigFile(configPath: string): Promise<unknown> {
  const resolved = path.resolve(configPath);
  const content = await fs.readFile(resolved, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in config file: ${resolved}`);
  }
}

// === Programmatic API ===

export interface PublishOptions {
  deployment: string; // slug
  config: string; // file path
  flowName?: string;
  projectId?: string;
  wait?: boolean;
  timeout?: number; // ms
  idempotencyKey?: string;
  signal?: AbortSignal;
  onStatus?: (status: string, substatus: string | null) => void;
}

export async function publish(options: PublishOptions) {
  const projectId = options.projectId ?? requireProjectId();
  const base = resolveBaseUrl();

  // 1. Read and parse config file
  const configContent = await readConfigFile(options.config);

  // 2. Trigger publish via API
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const body = { source: 'config' as const, config: configContent };

  const response = await authenticatedFetch(
    `${base}/api/projects/${projectId}/deployments/${options.deployment}/publish`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        `Publish failed (${response.status})`,
    );
  }

  const data = await response.json();
  if (options.wait === false) return data;

  // 3. Stream deployment status via SSE
  const result = await streamDeploymentStatus(projectId, options.deployment, {
    timeout: options.timeout,
    signal: options.signal,
    onStatus: options.onStatus,
  });

  return { ...data, ...result };
}

// === CLI Command Handler ===

interface PublishCommandOptions extends GlobalOptions {
  deployment: string;
  config: string;
  flow?: string;
  project?: string;
  wait?: boolean;
  timeout?: string;
  idempotencyKey?: string;
  output?: string;
  json?: boolean;
}

const statusLabels: Record<string, string> = {
  bundling: 'Bundling...',
  'bundling:building': 'Building bundle...',
  'bundling:publishing': 'Publishing to CDN...',
  deploying: 'Deploying container...',
  'deploying:provisioning': 'Provisioning container...',
  'deploying:starting': 'Starting container...',
  active: 'Container is live',
  published: 'Published',
  failed: 'Deployment failed',
};

export async function publishCommand(
  options: PublishCommandOptions,
): Promise<void> {
  const log = createCommandLogger(options);

  const timeoutMs = options.timeout
    ? parseInt(options.timeout, 10) * 1000
    : undefined;

  try {
    log.info(`Publishing to ${options.deployment}...`);

    const result = await publish({
      deployment: options.deployment,
      config: options.config,
      flowName: options.flow,
      projectId: options.project,
      wait: options.wait !== false,
      timeout: timeoutMs,
      idempotencyKey: options.idempotencyKey,
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
      log.success(`Live at ${r.target || r.publicUrl}`);
    } else if (r.status === 'active') {
      log.success(`Active at ${r.target || r.containerUrl}`);
    } else if (r.status === 'failed') {
      log.error(`Failed: ${r.errorMessage || 'Unknown error'}`);
      process.exit(1);
    } else {
      log.info(`Status: ${r.status}`);
    }
  } catch (err) {
    log.error(err instanceof Error ? err.message : 'Publish failed');
    process.exit(1);
  }
}
