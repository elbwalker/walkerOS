import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
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

export async function updateDeployment(options: {
  slug: string;
  label?: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const base = resolveBaseUrl();

  const response = await authenticatedFetch(
    `${base}/api/projects/${id}/deployments/${options.slug}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: options.label }),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ||
        'Failed to update deployment',
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
  const logger = createCommandLogger(options);
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

export async function updateDeploymentCommand(
  slug: string,
  options: DeploymentsCommandOptions,
): Promise<void> {
  await handleResult(
    () =>
      updateDeployment({
        slug,
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
