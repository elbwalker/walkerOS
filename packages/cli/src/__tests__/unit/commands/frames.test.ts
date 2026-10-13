import { apiFetch } from '../../../core/http.js';
import {
  listFrames,
  listPageFrames,
  getFrame,
} from '../../../commands/frames/index.js';

jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));
jest.mock('../../../core/http.js', () => ({ apiFetch: jest.fn() }));

const mockApiFetch = jest.mocked(apiFetch);
const ok = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

describe('frames programmatic API', () => {
  afterEach(() => jest.clearAllMocks());

  it('listFrames reads the lean listing of the flow', async () => {
    mockApiFetch.mockResolvedValue(ok({ frames: [] }));
    await listFrames({ projectId: 'proj_1', flowId: 'flow_1' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/frames',
    );
  });

  it('listPageFrames encodes the page key', async () => {
    mockApiFetch.mockResolvedValue(ok({ frames: [] }));
    await listPageFrames({
      projectId: 'proj_1',
      flowId: 'flow_1',
      pageKey: 'https://shop.example/cart?x=1',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/frames?pageKey=https%3A%2F%2Fshop.example%2Fcart%3Fx%3D1',
    );
  });

  it('getFrame reads one frame by id', async () => {
    mockApiFetch.mockResolvedValue(ok({ id: 'frm_V1StGXR8Z5jdHi6BmyT7K' }));
    await getFrame({
      projectId: 'proj_1',
      flowId: 'flow_1',
      frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/flows/flow_1/frames/frm_V1StGXR8Z5jdHi6BmyT7K',
    );
  });

  it.each([
    ['FRAME_NOT_FOUND', 'Frame not found'],
    ['FLOW_NOT_FOUND', 'Flow not found'],
  ])('getFrame throws %s with the wire message', async (code, message) => {
    mockApiFetch.mockResolvedValue(ok({ error: { code, message } }, 404));
    await expect(
      getFrame({
        projectId: 'proj_1',
        flowId: 'flow_1',
        frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
      }),
    ).rejects.toMatchObject({ code, message });
  });

  it.each([
    ['listFrames', () => listFrames({ projectId: 'proj_1', flowId: 'flow_1' })],
    [
      'listPageFrames',
      () =>
        listPageFrames({
          projectId: 'proj_1',
          flowId: 'flow_1',
          pageKey: 'https://shop.example/cart',
        }),
    ],
    [
      'getFrame',
      () =>
        getFrame({
          projectId: 'proj_1',
          flowId: 'flow_1',
          frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
        }),
    ],
  ])(
    '%s throws CLIENT_OUTDATED with the wire message, never an empty read',
    async (_name, read) => {
      const message = 'This client is too old for this endpoint. Upgrade it.';
      mockApiFetch.mockResolvedValue(
        ok({ error: { code: 'CLIENT_OUTDATED', message } }, 426),
      );
      await expect(read()).rejects.toMatchObject({
        code: 'CLIENT_OUTDATED',
        message,
        status: 426,
      });
    },
  );

  it('surfaces FEATURE_NOT_AVAILABLE naming frames', async () => {
    mockApiFetch.mockResolvedValue(
      ok(
        {
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: 'frames is not available on your current plan',
          },
        },
        403,
      ),
    );
    await expect(
      listFrames({ projectId: 'proj_1', flowId: 'flow_1' }),
    ).rejects.toMatchObject({
      code: 'FEATURE_NOT_AVAILABLE',
      message: 'frames is not available on your current plan',
    });
  });
});
