import { requireProjectId } from '../../core/auth.js';
import { apiRequest } from '../../core/api-request.js';
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
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/journeys',
    {
      path: { projectId: id, flowId: options.flowId },
      query: { traceId: options.traceId || undefined, limit: options.limit },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to read flow journeys');
  }
  return response.json();
}
