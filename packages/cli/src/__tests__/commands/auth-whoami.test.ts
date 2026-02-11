const mockApiRequest = jest.fn();

jest.mock('../../core/auth.js', () => ({
  apiRequest: mockApiRequest,
}));

describe('whoami', () => {
  afterEach(() => jest.clearAllMocks());

  it('should call GET /api/auth/whoami', async () => {
    const { whoami } = await import('../../commands/auth/index.js');
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
    const { whoami } = await import('../../commands/auth/index.js');
    mockApiRequest.mockRejectedValue(new Error('WALKEROS_TOKEN not set.'));

    await expect(whoami()).rejects.toThrow('WALKEROS_TOKEN not set.');
  });
});
