import {
  createHeartbeat,
  computeCounterDelta,
  type CounterSnapshot,
} from '../heartbeat.js';
import type { Collector, Logger } from '@walkeros/core';
import type { DedupedError, RingEntry } from '../log-ring.js';

/**
 * A `Logger.Instance` whose methods are jest spies, so tests can both pass it to
 * `createHeartbeat` (typed) and assert on `.error`/`.warn` calls. `scope`
 * returns the same instance so scoped logging resolves back to these spies.
 */
function makeSpyLogger(): Logger.Instance {
  const logger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: (message: string | Error): never => {
      throw new Error(typeof message === 'string' ? message : message.message);
    },
    json: jest.fn(),
    scope: (_name: string): Logger.Instance => logger,
  };
  return logger;
}

const mockLogger = makeSpyLogger();

/** A heartbeat record entry as serialized into the POST body. */
interface SerializedRecord {
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

/** A heartbeat log line as serialized into the POST body. */
interface SerializedLog {
  time: string;
  level: string;
  message: string;
}

interface SerializedDestination {
  count: number;
  failed: number;
  duration: number;
  dlqSize: number;
  dropped: number;
}

/** The shape of the JSON body the heartbeat POSTs (fields under test). */
interface HeartbeatBody {
  instanceId?: string;
  /** Configured heartbeat cadence in milliseconds. */
  intervalMs?: number;
  uptime?: number;
  recentErrors?: SerializedRecord[];
  recentLogs?: SerializedLog[];
  counters?: {
    eventsIn: number;
    eventsOut: number;
    eventsFailed: number;
    destinations: Record<string, SerializedDestination>;
  };
}

/**
 * Read and parse the JSON body of the first fetch call from a typed fetch mock,
 * without casts. The mock's `.mock.calls` are typed via `jest.fn<typeof fetch>`,
 * so the init arg is `RequestInit | undefined` and its `body` is narrowed to a
 * string before parsing.
 */
function readHeartbeatBody(
  mock: jest.Mock<ReturnType<typeof fetch>, Parameters<typeof fetch>>,
): HeartbeatBody {
  const init = mock.mock.calls[0]?.[1];
  const body = init?.body;
  if (typeof body !== 'string') {
    throw new Error('expected a string request body');
  }
  const parsed: HeartbeatBody = JSON.parse(body);
  return parsed;
}

function createFetchMock(): jest.Mock<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
> {
  return jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  );
}

describe('heartbeat', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // mockLogger is shared across tests; clear its spies' call history so
    // assertions don't see calls from a prior test.
    jest.clearAllMocks();
  });

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
      mockLogger,
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
      mockLogger,
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
      mockLogger,
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

    const fetchMock = createFetchMock();
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
    const body = readHeartbeatBody(fetchMock);

    // Fields are present
    expect(body.recentErrors).toBeDefined();
    expect(body.recentLogs).toBeDefined();

    // Secret is redacted in both
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain(secret);

    // recentErrors structure
    const recentErrors = body.recentErrors ?? [];
    expect(recentErrors).toHaveLength(1);
    expect(recentErrors[0]?.count).toBe(3);
    expect(typeof recentErrors[0]?.firstSeen).toBe('string'); // ISO string
    expect(typeof recentErrors[0]?.lastSeen).toBe('string');

    // recentLogs structure
    const recentLogs = body.recentLogs ?? [];
    expect(recentLogs).toHaveLength(1);
    expect(recentLogs[0]?.level).toBe('warn');
    expect(typeof recentLogs[0]?.time).toBe('string'); // ISO string
  });

  it('always sends recentErrors (empty array) so the snapshot can clear, but omits empty recentLogs', async () => {
    const fetchMock = createFetchMock();
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

    const body = readHeartbeatBody(fetchMock);

    // recentErrors is ALWAYS sent so an empty array clears a stale snapshot.
    expect(body.recentErrors).toEqual([]);
    // recentLogs stays omit-when-empty (no clear semantics needed).
    expect(body.recentLogs).toBeUndefined();
  });

  it('still sends recentErrors as [] when the supplier is absent, omitting recentLogs', async () => {
    const fetchMock = createFetchMock();
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

    const body = readHeartbeatBody(fetchMock);

    expect(body.recentErrors).toEqual([]);
    expect(body.recentLogs).toBeUndefined();
  });
});

describe('heartbeat per-destination breakdown (dlqSize + dropped)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function typedLogger(): Logger.Instance {
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

  function statusWith(
    destinations: Collector.Status['destinations'],
    dropped: Collector.Status['dropped'],
  ): Collector.Status {
    return {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations,
      dropped,
      breakers: {},
      connectionErrors: {},
    };
  }

  it('includes per-destination dlqSize (gauge) and dropped (delta) in counters', async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock;

    const status = statusWith(
      {
        bigquery: {
          count: 10,
          failed: 4,
          duration: 200,
          queuePushSize: 0,
          dlqSize: 3,
        },
      },
      { 'destination.bigquery': { dlq: 2, queue: 1 } },
    );

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
        getCounters: () => status,
      },
      typedLogger(),
    );

    await heartbeat.sendOnce();

    const body = readHeartbeatBody(fetchMock);

    const dest = body.counters?.destinations['bigquery'];
    expect(dest).toBeDefined();
    expect(dest?.failed).toBe(4);
    // dlqSize is a point-in-time gauge, not a delta.
    expect(dest?.dlqSize).toBe(3);
    // dropped sums queue + dlq drops for the destination step (delta from 0).
    expect(dest?.dropped).toBe(3);
  });
});

describe('heartbeat flushSoon (debounced out-of-band beat)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function typedLogger(): Logger.Instance {
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

  it('coalesces a burst of N notifications within the debounce window into exactly one extra send', async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock;

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
        flushDebounceMs: 1000,
      },
      typedLogger(),
    );

    // Five new-error notifications inside the debounce window.
    heartbeat.flushSoon();
    heartbeat.flushSoon();
    heartbeat.flushSoon();
    heartbeat.flushSoon();
    heartbeat.flushSoon();

    // Nothing fires before the debounce elapses.
    expect(fetchMock.mock.calls).toHaveLength(0);

    await jest.advanceTimersByTimeAsync(1000);

    // Exactly ONE extra POST for the whole burst.
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  it('does not start or reset the steady interval timer', async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock;

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
        flushDebounceMs: 1000,
      },
      typedLogger(),
    );

    // flushSoon without start(): the steady interval is never created, so only
    // the debounced flush fires — no interval beat appears afterward.
    heartbeat.flushSoon();
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchMock.mock.calls).toHaveLength(1);

    // Advancing well past one interval produces no further sends because the
    // interval was never started by flushSoon.
    await jest.advanceTimersByTimeAsync(120000);
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
});

describe('heartbeat intervalMs (advertised cadence)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function typedLogger(): Logger.Instance {
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

  it('includes the configured intervalMs (in ms) in the body', async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock;

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
      },
      typedLogger(),
    );

    await heartbeat.sendOnce();

    const body = readHeartbeatBody(fetchMock);
    expect(body.intervalMs).toBe(60000);
  });
});

describe('heartbeat uptime (restart evidence)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function typedLogger(): Logger.Instance {
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

  it('increases uptime across two beats within one process', async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock;

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
      },
      typedLogger(),
    );

    await heartbeat.sendOnce();
    const firstInit = fetchMock.mock.calls[0]?.[1];
    const firstBodyRaw = firstInit?.body;
    if (typeof firstBodyRaw !== 'string') {
      throw new Error('expected a string request body');
    }
    const firstBody: HeartbeatBody = JSON.parse(firstBodyRaw);

    await jest.advanceTimersByTimeAsync(5000);

    await heartbeat.sendOnce();
    const secondInit = fetchMock.mock.calls[1]?.[1];
    const secondBodyRaw = secondInit?.body;
    if (typeof secondBodyRaw !== 'string') {
      throw new Error('expected a string request body');
    }
    const secondBody: HeartbeatBody = JSON.parse(secondBodyRaw);

    expect(firstBody.uptime).toBeDefined();
    expect(secondBody.uptime).toBeDefined();
    expect(secondBody.uptime ?? 0).toBeGreaterThan(firstBody.uptime ?? 0);
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
        demo: { count: 5, failed: 0, duration: 100, dlqSize: 0, dropped: 0 },
      },
    };
    const last: CounterSnapshot = {
      in: 2,
      out: 2,
      failed: 0,
      destinations: {
        demo: { count: 2, failed: 0, duration: 40, dlqSize: 0, dropped: 0 },
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
      destinations: {
        newDest: { count: 1, failed: 0, duration: 10, dlqSize: 0, dropped: 0 },
      },
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

  it('deltas dropped but reports dlqSize as the current gauge', () => {
    const current: CounterSnapshot = {
      in: 10,
      out: 8,
      failed: 2,
      destinations: {
        bq: { count: 10, failed: 2, duration: 50, dlqSize: 5, dropped: 7 },
      },
    };
    const last: CounterSnapshot = {
      in: 4,
      out: 3,
      failed: 1,
      destinations: {
        bq: { count: 4, failed: 1, duration: 20, dlqSize: 2, dropped: 3 },
      },
    };
    const delta = computeCounterDelta(current, last);
    // dropped is monotonic → delta.
    expect(delta.destinations.bq.dropped).toBe(4);
    // dlqSize is a point-in-time depth → report the current value, not a delta.
    expect(delta.destinations.bq.dlqSize).toBe(5);
  });
});
