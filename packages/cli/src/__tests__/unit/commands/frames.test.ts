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

  it('listFrames reads the lean project listing', async () => {
    mockApiFetch.mockResolvedValue(ok({ frames: [] }));
    await listFrames({ projectId: 'proj_1' });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/projects/proj_1/frames');
  });

  it('listPageFrames encodes the page key', async () => {
    mockApiFetch.mockResolvedValue(ok({ frames: [] }));
    await listPageFrames({
      projectId: 'proj_1',
      pageKey: 'https://shop.example/cart?x=1',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/frames?pageKey=https%3A%2F%2Fshop.example%2Fcart%3Fx%3D1',
    );
  });

  it('getFrame reads one frame by id', async () => {
    mockApiFetch.mockResolvedValue(ok({ id: 'frm_V1StGXR8Z5jdHi6BmyT7K' }));
    await getFrame({
      projectId: 'proj_1',
      frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/projects/proj_1/frames/frm_V1StGXR8Z5jdHi6BmyT7K',
    );
  });

  it('getFrame throws NOT_FOUND with the wire message', async () => {
    mockApiFetch.mockResolvedValue(
      ok({ error: { code: 'NOT_FOUND', message: 'Frame not found' } }, 404),
    );
    await expect(
      getFrame({ projectId: 'proj_1', frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K' }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Frame not found',
    });
  });

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
    await expect(listFrames({ projectId: 'proj_1' })).rejects.toMatchObject({
      code: 'FEATURE_NOT_AVAILABLE',
      message: 'frames is not available on your current plan',
    });
  });
});
