import {
  createHeartbeat,
  computeCounterDelta,
  type CounterSnapshot,
} from '../heartbeat.js';
import type { Logger } from '@walkeros/core';
import type { DedupedError, RingEntry } from '../log-ring.js';

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

describe('heartbeat snapshot suppliers', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function makeTypedLogger(): Logger.Instance {
    const logger: Logger.Instance = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      throw: (message: string | Error): never => {
        throw new Error(
          typeof message === 'string' ? message : message.message,
        );
      },
      json: jest.fn(),
      scope: (_name: string): Logger.Instance => logger,
    };
    return logger;
  }

  const typedLogger = makeTypedLogger();

  it('includes recentErrors and recentLogs in the body when suppliers return non-empty arrays, with secrets redacted', async () => {
    const secret = 'sk-1234567890abcdef1234';
    const now = Date.now();

    const fetchMock = jest.fn().mockResolvedValue({ status: 200, ok: true });
    globalThis.fetch = fetchMock;

    const errors: DedupedError[] = [
      {
        message: `Connection failed TOKEN=${secret}`,
        count: 3,
        firstSeen: now - 5000,
        lastSeen: now,
      },
    ];

    const logs: RingEntry[] = [
      {
        time: now - 1000,
        level: 'warn',
        message: `Warning: secret=${secret} detected`,
      },
    ];

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
        getErrors: () => errors,
        getLogs: () => logs,
      },
      typedLogger,
    );

    await heartbeat.sendOnce();

    expect(fetchMock.mock.calls).toHaveLength(1);
    const reqInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(reqInit.body as string) as Record<string, unknown>;

    // Fields are present
    expect(body).toHaveProperty('recentErrors');
    expect(body).toHaveProperty('recentLogs');

    // Secret is redacted in both
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain(secret);

    // recentErrors structure
    const recentErrors = body['recentErrors'] as Array<Record<string, unknown>>;
    expect(recentErrors).toHaveLength(1);
    expect(recentErrors[0]['count']).toBe(3);
    expect(typeof recentErrors[0]['firstSeen']).toBe('string'); // ISO string
    expect(typeof recentErrors[0]['lastSeen']).toBe('string');

    // recentLogs structure
    const recentLogs = body['recentLogs'] as Array<Record<string, unknown>>;
    expect(recentLogs).toHaveLength(1);
    expect(recentLogs[0]['level']).toBe('warn');
    expect(typeof recentLogs[0]['time']).toBe('string'); // ISO string
  });

  it('omits recentErrors and recentLogs when suppliers return empty arrays', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 200, ok: true });
    globalThis.fetch = fetchMock;

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
        getErrors: () => [],
        getLogs: () => [],
      },
      typedLogger,
    );

    await heartbeat.sendOnce();

    const reqInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(reqInit.body as string) as Record<string, unknown>;

    expect(body).not.toHaveProperty('recentErrors');
    expect(body).not.toHaveProperty('recentLogs');
  });

  it('omits recentErrors and recentLogs when suppliers are absent', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 200, ok: true });
    globalThis.fetch = fetchMock;

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
        // no getErrors, no getLogs
      },
      typedLogger,
    );

    await heartbeat.sendOnce();

    const reqInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(reqInit.body as string) as Record<string, unknown>;

    expect(body).not.toHaveProperty('recentErrors');
    expect(body).not.toHaveProperty('recentLogs');
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
