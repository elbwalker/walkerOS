import type { Collector, Mapping, WalkerOS } from '../types';
import { createMockLogger } from '../mockLogger';
import { getMappingValue } from '../mapping';

/**
 * Mapping error visibility: throws inside user-supplied callbacks
 * (condition, fn, validate) MUST log via the scoped logger but MUST
 * NOT increment `collector.status.failed` (Category B - user code).
 *
 * The outer `processMappingValue` wrap in `getMappingValue` (Category A)
 * MUST log AND increment `status.failed` for internal walkerOS pipeline
 * failures.
 */

function createTestCollector(): Collector.Instance {
  const mockLogger = createMockLogger();
  return {
    allowed: true,
    config: {
      globalsStatic: {},
      sessionStatic: {},
      queueMax: 1_000,
    },
    consent: {},
    custom: {},
    destinations: {},
    transformers: {},
    stores: {},
    globals: {},
    hooks: {},
    logger: mockLogger,
    on: {},
    queue: [],
    round: 0,
    session: undefined,
    timing: Date.now(),
    user: {},
    sources: {},
    pending: { destinations: {} },
    push: jest.fn(),
    command: jest.fn(),
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
    },
  } as unknown as Collector.Instance;
}

describe('mapping condition throws (Category B)', () => {
  test('logs via scoped logger and does NOT increment status.failed', async () => {
    const collector = createTestCollector();
    const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

    const mapping: Mapping.Value = {
      key: 'data.id',
      condition: () => {
        throw new Error('condition boom');
      },
    };

    const result = await getMappingValue(event, mapping, { collector, event });

    // Existing "skip this rule" semantic is preserved.
    expect(result).toBeUndefined();

    // No counter bump for user-code failures.
    expect(collector.status.failed).toBe(0);

    // Find the error log somewhere in the logger tree (root or scoped).
    const errorCall = findLoggerError(collector, 'mapping condition failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});

describe('mapping fn throws (Category B)', () => {
  test('logs via scoped logger and does NOT increment status.failed', async () => {
    const collector = createTestCollector();
    const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

    const mapping: Mapping.Value = {
      fn: () => {
        throw new Error('fn boom');
      },
    };

    const result = await getMappingValue(event, mapping, { collector, event });

    // fn throw -> value undefined -> rule yields no property
    expect(result).toBeUndefined();
    expect(collector.status.failed).toBe(0);

    const errorCall = findLoggerError(collector, 'mapping fn failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});

describe('mapping validate throws (Category B)', () => {
  test('logs via scoped logger and does NOT increment status.failed', async () => {
    const collector = createTestCollector();
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      data: { id: 'abc' },
    };

    const mapping: Mapping.Value = {
      key: 'data.id',
      validate: () => {
        throw new Error('validate boom');
      },
    };

    const result = await getMappingValue(event, mapping, { collector, event });

    // validate-throw -> mappingValue cleared -> result undefined
    expect(result).toBeUndefined();
    expect(collector.status.failed).toBe(0);

    const errorCall = findLoggerError(collector, 'mapping validate failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});

describe('processMappingValue outer wrap (Category A)', () => {
  test('logs and increments status.failed when an internal throw escapes', async () => {
    const collector = createTestCollector();
    const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

    // Force an internal throw: a malformed mapping entry shape. The
    // `Object.entries(map)` call in processMappingValue iterates `map`;
    // a Proxy that throws on Object.keys access surfaces a non-user-callback
    // failure inside processMappingValue.
    const exploding = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('internal boom');
        },
        getOwnPropertyDescriptor() {
          throw new Error('internal boom');
        },
      },
    );

    const mapping: Mapping.Value = {
      map: exploding as Record<string, Mapping.Value>,
    };

    const result = await getMappingValue(event, mapping, { collector, event });

    // Outer wrap catches; downstream undefined.
    expect(result).toBeUndefined();

    // Internal pipeline failures count.
    expect(collector.status.failed).toBe(1);

    const errorCall = findLoggerError(collector, 'mapping processing failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});

// --- helpers ---

/**
 * Walk the mock-logger tree looking for an `.error` call whose first
 * argument exactly matches `verb`. The mapping code may log on the
 * root logger or on a scoped child; both are valid placements.
 */
function findLoggerError(
  collector: Collector.Instance,
  verb: string,
): unknown[] | undefined {
  const root = collector.logger as unknown as ReturnType<
    typeof createMockLogger
  >;
  const visited: Array<ReturnType<typeof createMockLogger>> = [root];
  for (let i = 0; i < visited.length; i++) {
    const node = visited[i];
    const errorMock = node.error as jest.Mock;
    const call = errorMock.mock.calls.find((args) => args[0] === verb);
    if (call) return call;
    if (node.scopedLoggers) visited.push(...node.scopedLoggers);
  }
  return undefined;
}
