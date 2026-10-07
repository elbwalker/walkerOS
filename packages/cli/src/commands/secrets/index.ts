import { requireProjectId } from '../../core/auth.js';
import { apiRequest } from '../../core/api-request.js';
import type { ResponseJson } from '../../core/api-request.js';
import { throwApiError } from '../../core/api-error.js';

// === Programmatic API ===

export interface ListSecretsOptions {
  projectId?: string;
  flowId: string;
}

export async function listSecrets(
  options: ListSecretsOptions,
): Promise<
  ResponseJson<'GET /api/projects/{projectId}/flows/{flowId}/secrets', 200>
> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/secrets',
    { path: { projectId: pid, flowId: options.flowId } },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to list secrets');
  }
  return response.json();
}

export interface CreateSecretOptions {
  projectId?: string;
  flowId: string;
  name: string;
  value: string;
}

export async function createSecret(
  options: CreateSecretOptions,
): Promise<
  ResponseJson<'POST /api/projects/{projectId}/flows/{flowId}/secrets', 201>
> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'POST /api/projects/{projectId}/flows/{flowId}/secrets',
    {
      path: { projectId: pid, flowId: options.flowId },
      body: { name: options.name, value: options.value },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to create secret');
  }
  return response.json();
}

export interface UpdateSecretOptions {
  projectId?: string;
  flowId: string;
  secretId: string;
  value: string;
}

export async function updateSecret(
  options: UpdateSecretOptions,
): Promise<
  ResponseJson<
    'PUT /api/projects/{projectId}/flows/{flowId}/secrets/{secretId}',
    200
  >
> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'PUT /api/projects/{projectId}/flows/{flowId}/secrets/{secretId}',
    {
      path: {
        projectId: pid,
        flowId: options.flowId,
        secretId: options.secretId,
      },
      body: { value: options.value },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to update secret');
  }
  return response.json();
}

export interface DeleteSecretOptions {
  projectId?: string;
  flowId: string;
  secretId: string;
}

export async function deleteSecret(
  options: DeleteSecretOptions,
): Promise<{ success: true }> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'DELETE /api/projects/{projectId}/flows/{flowId}/secrets/{secretId}',
    {
      path: {
        projectId: pid,
        flowId: options.flowId,
        secretId: options.secretId,
      },
    },
  );
  // App returns 204 No Content (and 204 even when the secret is missing).
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to delete secret');
  }
  return { success: true };
}
