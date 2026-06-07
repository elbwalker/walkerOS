import { requireProjectId } from '../../core/auth.js';
import { apiFetch } from '../../core/http.js';
import { throwApiError } from '../../core/api-error.js';
import type { components } from '../../types/api.gen.js';

// === Programmatic API ===

export interface ListSecretsOptions {
  projectId?: string;
  flowId: string;
}

export async function listSecrets(
  options: ListSecretsOptions,
): Promise<components['schemas']['SecretListResponse']> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/secrets`,
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
): Promise<components['schemas']['SecretSummary']> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/secrets`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: options.name, value: options.value }),
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
): Promise<components['schemas']['SecretSummary']> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/secrets/${options.secretId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: options.value }),
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
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/secrets/${options.secretId}`,
    { method: 'DELETE' },
  );
  // App returns 204 No Content (and 204 even when the secret is missing).
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to delete secret');
  }
  return { success: true };
}
