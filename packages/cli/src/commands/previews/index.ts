import { requireProjectId } from '../../core/auth.js';
import { apiFetch } from '../../core/http.js';
import { throwApiError } from '../../core/api-error.js';
import { getFlow } from '../flows/index.js';

// === Programmatic API ===

export interface ListPreviewsOptions {
  projectId?: string;
  flowId: string;
}

export async function listPreviews(options: ListPreviewsOptions) {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/previews`,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to list previews');
  }
  return response.json();
}

export interface GetPreviewOptions {
  projectId?: string;
  flowId: string;
  previewId: string;
}

export async function getPreview(options: GetPreviewOptions) {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/previews/${options.previewId}`,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to get preview');
  }
  return response.json();
}

export interface CreatePreviewOptions {
  projectId?: string;
  flowId: string;
  flowName?: string;
  flowSettingsId?: string;
}

export async function createPreview(options: CreatePreviewOptions) {
  const pid = options.projectId ?? requireProjectId();

  let settingsId = options.flowSettingsId;
  if (!settingsId) {
    if (!options.flowName) {
      throw new Error('Either flowName or flowSettingsId is required');
    }
    // Resolve flow settings name → id (same pattern deploy uses)
    const flow = await getFlow({ projectId: pid, flowId: options.flowId });
    const settings = (
      flow as { settings?: Array<{ id: string; name: string }> }
    ).settings;
    const match = settings?.find((s) => s.name === options.flowName);
    if (!match) {
      throw new Error(
        `Flow settings named "${options.flowName}" not found on flow ${options.flowId}`,
      );
    }
    settingsId = match.id;
  }

  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/previews`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowSettingsId: settingsId }),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to create preview');
  }
  return response.json();
}

export interface DeletePreviewOptions {
  projectId?: string;
  flowId: string;
  previewId: string;
}

export async function deletePreview(options: DeletePreviewOptions) {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/previews/${options.previewId}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to delete preview');
  }
  // App returns 204 No Content on success; older surfaces may return JSON.
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}
