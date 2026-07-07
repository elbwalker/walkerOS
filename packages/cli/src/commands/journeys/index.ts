import { requireProjectId } from '../../core/auth.js';
import { apiFetch } from '../../core/http.js';
import { throwApiError } from '../../core/api-error.js';

// === Programmatic API ===

export interface ListJourneysOptions {
  projectId?: string;
  flowId: string;
  /** Return only journeys for one trace, when given. */
  traceId?: string;
  /** Max journeys to return (most recent kept). */
  limit?: number;
}

/**
 * Read a flow's active Observe session journeys from the app. The flow's session
 * is resolved app-side (`observe_sessions.flow_id` is UNIQUE), so the caller
 * passes `flowId`, not a session id; a flow with no active session returns an
 * envelope with `sessionId: null` and empty journeys rather than an error.
 */
export async function listJourneys(options: ListJourneysOptions) {
  const id = options.projectId ?? requireProjectId();
  const params = new URLSearchParams();
  if (options.traceId) params.set('traceId', options.traceId);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  const qs = params.toString();

  const response = await apiFetch(
    `/api/projects/${id}/flows/${options.flowId}/journeys${qs ? `?${qs}` : ''}`,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to read flow journeys');
  }
  return response.json();
}
