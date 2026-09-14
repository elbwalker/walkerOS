import { requireProjectId } from '../../../core/auth.js';
import { apiFetch } from '../../../core/http.js';
import {
  listReleases,
  getRelease,
  listStepHistory,
  setReleaseRationale,
  listThreads,
  createThread,
  addThreadMessage,
  listKnowledge,
} from '../../../commands/hub/index.js';
import type { ReleaseRef } from '../../../commands/hub/index.js';

jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));
jest.mock('../../../core/http.js', () => ({ apiFetch: jest.fn() }));

const mockApiFetch = jest.mocked(apiFetch);
const mockRequireProjectId = jest.mocked(requireProjectId);

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('hub programmatic API', () => {
  afterEach(() => jest.clearAllMocks());

  it('listReleases asks for the rationale-carrying index', async () => {
    mockApiFetch.mockResolvedValue(
      ok({ releases: [], total: 0, limit: 20, offset: 0 }),
    );
    await listReleases({
      projectId: 'proj_1',
      flowId: 'flow_1',
      limit: 5,
      offset: 10,
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/releases?rationale=true&limit=5&offset=10',
    );
  });

  it('listReleases falls back to the default project', async () => {
    mockApiFetch.mockResolvedValue(
      ok({ releases: [], total: 0, limit: 20, offset: 0 }),
    );
    await listReleases({ flowId: 'flow_1' });
    expect(mockRequireProjectId).toHaveBeenCalled();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_default/flows/flow_1/releases?rationale=true',
    );
  });

  it.each<[ReleaseRef, string]>([
    [
      { versionId: 'ver_abc' },
      '/api/projects/proj_1/flows/flow_1/releases/ver_abc',
    ],
    [{ versionNumber: 14 }, '/api/projects/proj_1/flows/flow_1/releases/14'],
  ])('getRelease addresses %j on the path', async (ref, path) => {
    mockApiFetch.mockResolvedValue(
      ok({ versionId: 'ver_abc', versionNumber: 14 }),
    );
    await getRelease({ projectId: 'proj_1', flowId: 'flow_1', ref });
    expect(mockApiFetch).toHaveBeenCalledWith(path);
  });

  it('getRelease throws the API error code on a 404', async () => {
    mockApiFetch.mockResolvedValue(
      ok({ error: { code: 'NOT_FOUND', message: 'Release not found' } }, 404),
    );
    await expect(
      getRelease({
        projectId: 'proj_1',
        flowId: 'flow_1',
        ref: { versionId: 'ver_x' },
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Release not found',
      status: 404,
    });
  });

  it('listStepHistory encodes step, flow and limit', async () => {
    mockApiFetch.mockResolvedValue(
      ok({ step: 'destination.ga4', entries: [] }),
    );
    await listStepHistory({
      projectId: 'proj_1',
      flowId: 'flow_1',
      step: 'destination.ga4',
      flow: 'web',
      limit: 30,
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/releases/step-history?step=destination.ga4&flow=web&limit=30',
    );
  });

  it('setReleaseRationale PUTs humanText for one versionId', async () => {
    mockApiFetch.mockResolvedValue(
      ok({ versionId: 'ver_abc', humanText: 'why' }),
    );
    await setReleaseRationale({
      projectId: 'proj_1',
      flowId: 'flow_1',
      versionId: 'ver_abc',
      text: 'why',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/releases/annotations',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ versionId: 'ver_abc', humanText: 'why' }),
      }),
    );
  });

  it('setReleaseRationale clears a rationale with a null humanText', async () => {
    mockApiFetch.mockResolvedValue(
      ok({ versionId: 'ver_abc', humanText: null }),
    );
    await setReleaseRationale({
      projectId: 'proj_1',
      flowId: 'flow_1',
      versionId: 'ver_abc',
      text: null,
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/releases/annotations',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ versionId: 'ver_abc', humanText: null }),
      }),
    );
  });

  it('listThreads sends includeMessages as the string the route parses', async () => {
    mockApiFetch.mockResolvedValue(ok({ threads: [], hasMoreThreads: false }));
    await listThreads({
      projectId: 'proj_1',
      flowId: 'flow_1',
      anchorType: 'release',
      anchorKey: 'ver_abc',
      status: 'open',
      includeMessages: true,
      limit: 20,
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/threads?anchorType=release&anchorKey=ver_abc&status=open&includeMessages=true&limit=20',
    );
  });

  it('createThread POSTs the anchor and first message', async () => {
    mockApiFetch.mockResolvedValue(ok({ id: 'thr_1' }, 201));
    await createThread({
      projectId: 'proj_1',
      flowId: 'flow_1',
      anchorType: 'step',
      anchorKey: 'destination.ga4',
      anchorLabel: 'GA4',
      text: 'hi',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/threads',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          anchorType: 'step',
          anchorKey: 'destination.ga4',
          anchorLabel: 'GA4',
          text: 'hi',
        }),
      }),
    );
  });

  it('addThreadMessage POSTs into the thread', async () => {
    mockApiFetch.mockResolvedValue(ok({ id: 'thr_1' }, 201));
    await addThreadMessage({
      projectId: 'proj_1',
      flowId: 'flow_1',
      threadId: 'thr_1',
      text: 'reply',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/threads/thr_1/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'reply' }),
      }),
    );
  });

  it('listKnowledge encodes the three narrowings and includeMessages', async () => {
    mockApiFetch.mockResolvedValue(ok({ entries: [], hasMoreEntries: false }));
    await listKnowledge({
      projectId: 'proj_1',
      pageKey: 'https://shop.example/cart',
      frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
      markId: 'm1',
      includeMessages: true,
      limit: 10,
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/knowledge?pageKey=https%3A%2F%2Fshop.example%2Fcart&frameId=frm_V1StGXR8Z5jdHi6BmyT7K&markId=m1&includeMessages=true&limit=10',
    );
  });

  it('surfaces FEATURE_NOT_AVAILABLE with the feature-naming message', async () => {
    mockApiFetch.mockResolvedValue(
      ok(
        {
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: 'hub is not available on your current plan',
          },
        },
        403,
      ),
    );
    await expect(
      listKnowledge({ projectId: 'proj_1', includeMessages: false }),
    ).rejects.toMatchObject({
      code: 'FEATURE_NOT_AVAILABLE',
      message: 'hub is not available on your current plan',
    });
  });
});
