import { apiRequest } from '../../core/auth.js';
import { whoami } from '../../commands/auth/index.js';

jest.mock('../../core/auth.js', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = jest.mocked(apiRequest);

describe('whoami', () => {
  afterEach(() => jest.clearAllMocks());

  it('should call GET /api/auth/whoami', async () => {
    mockApiRequest.mockResolvedValue({
      userId: 'usr_1',
      email: 'test@example.com',
      projectId: null,
    });

    const result = await whoami();

    expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/whoami');
    expect(result).toEqual({
      userId: 'usr_1',
      email: 'test@example.com',
      projectId: null,
    });
  });

  it('should propagate auth errors', async () => {
    mockApiRequest.mockRejectedValue(new Error('WALKEROS_TOKEN not set.'));

    await expect(whoami()).rejects.toThrow('WALKEROS_TOKEN not set.');
  });
});
