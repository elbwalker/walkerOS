import { createHeartbeat } from '../../runtime/heartbeat.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  throw: jest.fn(),
  scope: jest.fn(),
};

describe('createHeartbeat', () => {
  const config = {
    appUrl: 'https://app.example.com',
    token: 'sk-walkeros-abc',
    projectId: 'proj_123',
    flowId: 'flow_456',
    mode: 'collect',
    intervalMs: 60_000,
  };

  it('sends heartbeat with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const hb = createHeartbeat(config, mockLogger);
    await hb.sendOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.example.com/api/projects/proj_123/runners/heartbeat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-walkeros-abc',
          'Content-Type': 'application/json',
        }),
      }),
    );

    // Verify body contains expected fields
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.instanceId).toBeDefined();
    expect(body.flowId).toBe('flow_456');
    expect(body.mode).toBe('collect');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('does not throw on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const hb = createHeartbeat(config, mockLogger);
    await expect(hb.sendOnce()).resolves.toBeUndefined();
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('stop clears the interval', () => {
    mockFetch.mockResolvedValue({ ok: true });
    const hb = createHeartbeat(config, mockLogger);
    hb.start();
    hb.stop();
    // Advance time past interval — no more sends should happen
    jest.advanceTimersByTime(120_000);
    // Only the initial send from start() should have been called
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('updateConfigVersion updates the version in subsequent heartbeats', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const hb = createHeartbeat(config, mockLogger);
    hb.updateConfigVersion('v2');
    await hb.sendOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.configVersion).toBe('v2');
  });
});
