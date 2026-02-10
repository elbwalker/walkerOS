import {
  apiRequest,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';

describe('apiRequest', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
    delete process.env.WALKEROS_APP_URL;
    delete process.env.WALKEROS_PROJECT_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('sends Authorization: Bearer <token> header', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    await apiRequest('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-walkeros-test',
        }),
      }),
    );
  });

  it('uses resolved base URL', async () => {
    process.env.WALKEROS_APP_URL = 'http://localhost:3000';
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    await apiRequest('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/test',
      expect.any(Object),
    );
  });

  it('returns parsed JSON on 200', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ userId: 'user_1' }), { status: 200 }),
      );

    const result = await apiRequest('/api/test');
    expect(result).toEqual({ userId: 'user_1' });
  });

  it('returns { success: true } on 204', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    const result = await apiRequest('/api/test', { method: 'DELETE' });
    expect(result).toEqual({ success: true });
  });

  it('throws with error message from API response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Invalid token' } }), {
          status: 401,
        }),
      );

    await expect(apiRequest('/api/test')).rejects.toThrow('Invalid token');
  });

  it('throws when no token available', async () => {
    delete process.env.WALKEROS_TOKEN;

    await expect(apiRequest('/api/test')).rejects.toThrow(
      'WALKEROS_TOKEN not set',
    );
  });

  it('responseFormat: raw returns Response object', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('raw-body', { status: 200 }));

    const result = await apiRequest('/api/test', { responseFormat: 'raw' });
    expect(result).toBeInstanceOf(Response);
    expect(await (result as Response).text()).toBe('raw-body');
  });

  it('responseFormat: raw throws on non-ok responses', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Bad request' } }), {
          status: 400,
        }),
      );

    await expect(
      apiRequest('/api/test', { responseFormat: 'raw' }),
    ).rejects.toThrow('Bad request');
  });
});

describe('requireProjectId', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALKEROS_PROJECT_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when env var unset', () => {
    expect(() => requireProjectId()).toThrow('WALKEROS_PROJECT_ID not set');
  });

  it('returns project ID when set', () => {
    process.env.WALKEROS_PROJECT_ID = 'proj_abc';
    expect(requireProjectId()).toBe('proj_abc');
  });
});

describe('resolveBaseUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALKEROS_APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default URL when env var not set', () => {
    expect(resolveBaseUrl()).toBe('https://app.walkeros.io');
  });

  it('returns custom URL from env var', () => {
    process.env.WALKEROS_APP_URL = 'http://localhost:3000';
    expect(resolveBaseUrl()).toBe('http://localhost:3000');
  });
});
