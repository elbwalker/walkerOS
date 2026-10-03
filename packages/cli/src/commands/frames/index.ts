import { requireProjectId } from '../../core/auth.js';
import { apiRequest } from '../../core/api-request.js';
import type { ResponseJson } from '../../core/api-request.js';
import { throwApiResponseError } from '../../core/api-error.js';
import type { components } from '../../types/api.gen.js';

type FrameResponse = ResponseJson<
  'GET /api/projects/{projectId}/frames/{frameId}',
  200
>;
// The list operation answers one of two shapes, chosen by `pageKey`.
type FrameListResponse = components['schemas']['FrameListResponse'];
type FrameLeanListResponse = components['schemas']['FrameLeanListResponse'];

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throwApiResponseError(response, body, fallback);
  }
  return response.json();
}

export interface ListFramesOptions {
  projectId?: string;
}

/** Every live frame of the project, without marks. Requires the frames feature. */
export async function listFrames(
  options: ListFramesOptions = {},
): Promise<FrameLeanListResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest('GET /api/projects/{projectId}/frames', {
    path: { projectId: pid },
  });
  return readJson(response, 'Failed to list frames');
}

export interface ListPageFramesOptions {
  projectId?: string;
  pageKey: string;
}

/** The frames of one page at any depth, with their marks. */
export async function listPageFrames(
  options: ListPageFramesOptions,
): Promise<FrameListResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest('GET /api/projects/{projectId}/frames', {
    path: { projectId: pid },
    query: { pageKey: options.pageKey },
  });
  return readJson(response, 'Failed to list page frames');
}

export interface GetFrameOptions {
  projectId?: string;
  frameId: string;
}

export async function getFrame(
  options: GetFrameOptions,
): Promise<FrameResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'GET /api/projects/{projectId}/frames/{frameId}',
    { path: { projectId: pid, frameId: options.frameId } },
  );
  return readJson(response, 'Failed to read frame');
}
