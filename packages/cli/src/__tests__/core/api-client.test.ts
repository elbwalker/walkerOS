import { createApiClient } from '../../core/api-client.js';
import { getToken } from '../../core/auth.js';

jest.mock('../../core/auth.js', () => ({
  getToken: jest.fn(),
  resolveBaseUrl: jest.fn().mockReturnValue('https://app.walkeros.io'),
}));

const mockGetToken = jest.mocked(getToken);

describe('createApiClient', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a client with GET and POST methods', () => {
    mockGetToken.mockReturnValue('sk-walkeros-test');
    const client = createApiClient();
    expect(client).toBeDefined();
    expect(typeof client.GET).toBe('function');
    expect(typeof client.POST).toBe('function');
    expect(typeof client.PATCH).toBe('function');
    expect(typeof client.DELETE).toBe('function');
  });

  it('throws when no token available', () => {
    mockGetToken.mockReturnValue(undefined);
    expect(() => createApiClient()).toThrow('WALKEROS_TOKEN not set');
  });
});
