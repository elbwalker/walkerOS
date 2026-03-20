import {
  createHeartbeat,
  computeCounterDelta,
  type CounterSnapshot,
} from '../heartbeat.js';

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

describe('computeCounterDelta', () => {
  it('computes correct delta for top-level counters', () => {
    const current: CounterSnapshot = {
      in: 10,
      out: 8,
      failed: 2,
      destinations: {},
    };
    const last: CounterSnapshot = {
      in: 3,
      out: 2,
      failed: 1,
      destinations: {},
    };
    const delta = computeCounterDelta(current, last);
    expect(delta.eventsIn).toBe(7);
    expect(delta.eventsOut).toBe(6);
    expect(delta.eventsFailed).toBe(1);
  });

  it('computes correct delta for destination counters', () => {
    const current: CounterSnapshot = {
      in: 5,
      out: 5,
      failed: 0,
      destinations: {
        demo: { count: 5, failed: 0, duration: 100 },
      },
    };
    const last: CounterSnapshot = {
      in: 2,
      out: 2,
      failed: 0,
      destinations: {
        demo: { count: 2, failed: 0, duration: 40 },
      },
    };
    const delta = computeCounterDelta(current, last);
    expect(delta.destinations.demo.count).toBe(3);
    expect(delta.destinations.demo.duration).toBe(60);
  });

  it('handles new destination not in last snapshot', () => {
    const current: CounterSnapshot = {
      in: 1,
      out: 1,
      failed: 0,
      destinations: { newDest: { count: 1, failed: 0, duration: 10 } },
    };
    const last: CounterSnapshot = {
      in: 0,
      out: 0,
      failed: 0,
      destinations: {},
    };
    const delta = computeCounterDelta(current, last);
    expect(delta.destinations.newDest.count).toBe(1);
  });
});
