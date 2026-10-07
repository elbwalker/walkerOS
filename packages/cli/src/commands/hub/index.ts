import { requireProjectId } from '../../core/auth.js';
import { apiRequest } from '../../core/api-request.js';
import type { ApiRequestInit, ResponseJson } from '../../core/api-request.js';
import { throwApiResponseError } from '../../core/api-error.js';
import type { components } from '../../types/api.gen.js';

type VersionAnnotation = ResponseJson<
  'PUT /api/projects/{projectId}/flows/{flowId}/releases/annotations',
  200
>;
type StepHistoryResponse = ResponseJson<
  'GET /api/projects/{projectId}/flows/{flowId}/releases/step-history',
  200
>;
type ListHubThreadsResponse = ResponseJson<
  'GET /api/projects/{projectId}/flows/{flowId}/threads',
  200
>;
type HubThreadResponse = ResponseJson<
  'POST /api/projects/{projectId}/flows/{flowId}/threads',
  201
>;
type ListKnowledgeResponse = ResponseJson<
  'GET /api/projects/{projectId}/knowledge',
  200
>;

// === Release wire shapes, aliased onto the generated components ===

/** The rationale summary a release index row carries when asked for one. */
export type ReleaseRationaleSummary =
  components['schemas']['ReleaseRationaleSummary'];

/** The release index. Each row carries `rationale` when one was asked for. */
export type ReleaseIndexResponse = ResponseJson<
  'GET /api/projects/{projectId}/flows/{flowId}/releases',
  200
>;

/** The diff a release carries against its spine predecessor. */
export type ReleaseDiffResponse = components['schemas']['ReleaseDiff'];

/** One release in full: rationale plus the diff the server computed. */
export type ReleaseDetailResponse = ResponseJson<
  'GET /api/projects/{projectId}/flows/{flowId}/releases/{versionId}',
  200
>;

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
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/releases',
    {
      path: { projectId: pid, flowId: options.flowId },
      query: {
        rationale: 'true',
        limit: options.limit,
        offset: options.offset,
      },
    },
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
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/releases/{versionId}',
    { path: { projectId: pid, flowId: options.flowId, versionId: segment } },
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
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/releases/step-history',
    {
      path: { projectId: pid, flowId: options.flowId },
      query: { step: options.step, flow: options.flow, limit: options.limit },
    },
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
  const response = await apiRequest(
    'PUT /api/projects/{projectId}/flows/{flowId}/releases/annotations',
    {
      path: { projectId: pid, flowId: options.flowId },
      body: { versionId: options.versionId, humanText: options.text },
    },
  );
  return readJson(response, 'Failed to write release rationale');
}

type ListThreadsQuery = NonNullable<
  ApiRequestInit<'GET /api/projects/{projectId}/flows/{flowId}/threads'>['query']
>;
/** What a thread anchors to, as the contract declares it. */
export type ThreadAnchorType = NonNullable<ListThreadsQuery['anchorType']>;
/** A thread's status, as the contract declares it. */
export type ThreadStatus = NonNullable<ListThreadsQuery['status']>;

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
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/threads',
    {
      path: { projectId: pid, flowId: options.flowId },
      query: {
        anchorType: options.anchorType,
        anchorKey: options.anchorKey,
        status: options.status,
        includeMessages: options.includeMessages ? 'true' : 'false',
        limit: options.limit,
      },
    },
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
  const response = await apiRequest(
    'POST /api/projects/{projectId}/flows/{flowId}/threads',
    {
      path: { projectId: pid, flowId: options.flowId },
      body: {
        anchorType: options.anchorType,
        anchorKey: options.anchorKey,
        ...(options.anchorLabel !== undefined
          ? { anchorLabel: options.anchorLabel }
          : {}),
        text: options.text,
      },
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
  const response = await apiRequest(
    'POST /api/projects/{projectId}/flows/{flowId}/threads/{threadId}/messages',
    {
      path: {
        projectId: pid,
        flowId: options.flowId,
        threadId: options.threadId,
      },
      body: { text: options.text },
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
  const response = await apiRequest('GET /api/projects/{projectId}/knowledge', {
    path: { projectId: pid },
    query: {
      pageKey: options.pageKey,
      frameId: options.frameId,
      markId: options.markId,
      includeMessages: options.includeMessages ? 'true' : 'false',
      limit: options.limit,
    },
  });
  return readJson(response, 'Failed to read knowledge');
}
