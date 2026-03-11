import { createHeartbeat } from '../heartbeat.js';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

describe('heartbeat', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('logs error with expiry hint when heartbeat receives 401', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false });

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        intervalMs: 60000,
      },
      mockLogger as any,
    );

    await heartbeat.sendOnce();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('401'),
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('expired'),
    );
  });

  it('logs error with expiry hint when heartbeat receives 403', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ status: 403, ok: false });

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        intervalMs: 60000,
      },
      mockLogger as any,
    );

    await heartbeat.sendOnce();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('403'),
    );
  });

  it('logs debug on network error (no status)', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        intervalMs: 60000,
      },
      mockLogger as any,
    );

    await heartbeat.sendOnce();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ECONNREFUSED'),
    );
  });
});
