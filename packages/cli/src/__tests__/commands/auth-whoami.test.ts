import { createApiClient } from '../../core/api-client.js';
import { whoami } from '../../commands/auth/index.js';

jest.mock('../../core/api-client.js');

const mockGet = jest.fn();

(createApiClient as jest.Mock).mockReturnValue({
  GET: mockGet,
});

describe('whoami', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls GET /api/auth/whoami', async () => {
    mockGet.mockResolvedValue({
      data: {
        userId: 'usr_1',
        email: 'test@example.com',
        projectId: null,
      },
    });

    const result = await whoami();

    expect(mockGet).toHaveBeenCalledWith('/api/auth/whoami');
    expect(result).toEqual({
      userId: 'usr_1',
      email: 'test@example.com',
      projectId: null,
    });
  });

  it('throws on error response', async () => {
    mockGet.mockResolvedValue({
      error: { error: { message: 'Not authenticated' } },
    });

    await expect(whoami()).rejects.toThrow('Not authenticated');
  });
});
