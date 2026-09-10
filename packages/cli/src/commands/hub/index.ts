import { requireProjectId } from '../../core/auth.js';
import { apiFetch } from '../../core/http.js';
import { throwApiResponseError } from '../../core/api-error.js';
import type { components } from '../../types/api.gen.js';

type VersionAnnotation = components['schemas']['VersionAnnotation'];
type StepHistoryResponse = components['schemas']['StepHistoryResponse'];
type ListHubThreadsResponse = components['schemas']['ListHubThreadsResponse'];
type HubThreadResponse = components['schemas']['HubThreadResponse'];
type ListKnowledgeResponse = components['schemas']['ListKnowledgeResponse'];

// === Release wire shapes, aliased onto the generated components ===

/** The rationale summary a release index row carries when asked for one. */
export type ReleaseRationaleSummary =
  components['schemas']['ReleaseRationaleSummary'];

/** The release index. Each row carries `rationale` when one was asked for. */
export type ReleaseIndexResponse =
  components['schemas']['ListFlowReleasesResponse'];

/** The diff a release carries against its spine predecessor. */
export type ReleaseDiffResponse = components['schemas']['ReleaseDiff'];

/** One release in full: rationale plus the diff the server computed. */
export type ReleaseDetailResponse =
  components['schemas']['ReleaseDetailResponse'];

// === Programmatic API ===

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throwApiResponseError(response, body, fallback);
  }
  return response.json();
}

export interface ListReleasesOptions {
  projectId?: string;
  flowId: string;
  limit?: number;
  offset?: number;
}

/** The release index WITH its rationale summary. Requires the hub feature. */
export async function listReleases(
  options: ListReleasesOptions,
): Promise<ReleaseIndexResponse> {
  const pid = options.projectId ?? requireProjectId();
  const params = new URLSearchParams({ rationale: 'true' });
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined)
    params.set('offset', String(options.offset));
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/releases?${params.toString()}`,
  );
  return readJson(response, 'Failed to list releases');
}

/** How a release is addressed: by spine id, or by spine number. */
export type ReleaseRef = { versionId: string } | { versionNumber: number };

export interface GetReleaseOptions {
  projectId?: string;
  flowId: string;
  ref: ReleaseRef;
}

/**
 * One release in full: rationale plus the diff the SERVER computed against the
 * spine predecessor. The path segment is the id or the number; the app decides
 * which it was.
 */
export async function getRelease(
  options: GetReleaseOptions,
): Promise<ReleaseDetailResponse> {
  const pid = options.projectId ?? requireProjectId();
  const segment =
    'versionId' in options.ref
      ? options.ref.versionId
      : String(options.ref.versionNumber);
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/releases/${encodeURIComponent(segment)}`,
  );
  return readJson(response, 'Failed to read release');
}

export interface ListStepHistoryOptions {
  projectId?: string;
  flowId: string;
  step: string;
  flow?: string;
  limit?: number;
}

export async function listStepHistory(
  options: ListStepHistoryOptions,
): Promise<StepHistoryResponse> {
  const pid = options.projectId ?? requireProjectId();
  const params = new URLSearchParams({ step: options.step });
  if (options.flow !== undefined) params.set('flow', options.flow);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/releases/step-history?${params.toString()}`,
  );
  return readJson(response, 'Failed to read step history');
}

export interface SetReleaseRationaleOptions {
  projectId?: string;
  flowId: string;
  versionId: string;
  /**
   * The rationale to store. `null` CLEARS the one already there: `humanText`
   * is the only field a client may write, and null is how the route says
   * "remove it". Without it there would be no way back from a rationale
   * written by mistake.
   */
  text: string | null;
}

export async function setReleaseRationale(
  options: SetReleaseRationaleOptions,
): Promise<VersionAnnotation> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/releases/annotations`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        versionId: options.versionId,
        humanText: options.text,
      }),
    },
  );
  return readJson(response, 'Failed to write release rationale');
}

export type ThreadAnchorType =
  | 'step'
  | 'entity_action'
  | 'release'
  | 'contract'
  | 'tag';
export type ThreadStatus = 'open' | 'resolved';

export interface ListThreadsOptions {
  projectId?: string;
  flowId: string;
  anchorType?: ThreadAnchorType;
  anchorKey?: string;
  status?: ThreadStatus;
  includeMessages: boolean;
  limit?: number;
}

export async function listThreads(
  options: ListThreadsOptions,
): Promise<ListHubThreadsResponse> {
  const pid = options.projectId ?? requireProjectId();
  const params = new URLSearchParams();
  if (options.anchorType !== undefined)
    params.set('anchorType', options.anchorType);
  if (options.anchorKey !== undefined)
    params.set('anchorKey', options.anchorKey);
  if (options.status !== undefined) params.set('status', options.status);
  params.set('includeMessages', options.includeMessages ? 'true' : 'false');
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/threads?${params.toString()}`,
  );
  return readJson(response, 'Failed to list threads');
}

export interface CreateThreadOptions {
  projectId?: string;
  flowId: string;
  anchorType: ThreadAnchorType;
  anchorKey: string;
  anchorLabel?: string;
  text: string;
}

export async function createThread(
  options: CreateThreadOptions,
): Promise<HubThreadResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anchorType: options.anchorType,
        anchorKey: options.anchorKey,
        ...(options.anchorLabel !== undefined
          ? { anchorLabel: options.anchorLabel }
          : {}),
        text: options.text,
      }),
    },
  );
  return readJson(response, 'Failed to open thread');
}

export interface AddThreadMessageOptions {
  projectId?: string;
  flowId: string;
  threadId: string;
  text: string;
}

export async function addThreadMessage(
  options: AddThreadMessageOptions,
): Promise<HubThreadResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/threads/${encodeURIComponent(options.threadId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: options.text }),
    },
  );
  return readJson(response, 'Failed to add message');
}

export interface ListKnowledgeOptions {
  projectId?: string;
  pageKey?: string;
  frameId?: string;
  markId?: string;
  includeMessages: boolean;
  limit?: number;
}

export async function listKnowledge(
  options: ListKnowledgeOptions,
): Promise<ListKnowledgeResponse> {
  const pid = options.projectId ?? requireProjectId();
  const params = new URLSearchParams();
  if (options.pageKey !== undefined) params.set('pageKey', options.pageKey);
  if (options.frameId !== undefined) params.set('frameId', options.frameId);
  if (options.markId !== undefined) params.set('markId', options.markId);
  params.set('includeMessages', options.includeMessages ? 'true' : 'false');
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  const response = await apiFetch(
    `/api/projects/${pid}/knowledge?${params.toString()}`,
  );
  return readJson(response, 'Failed to read knowledge');
}
