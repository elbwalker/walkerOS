import type { Collector, WalkerOS } from '@walkeros/core';
import { createIngest, createMockLogger, FatalError } from '@walkeros/core';

/**
 * Boundary-error visibility: the outer tryCatchAsync wraps in
 * `push.ts` and `command.ts` MUST log + count when an exception
 * escapes the inner pipeline. Without this, operators see a clean
 * `{ ok: false }` result and no signal that the collector swallowed
 * a real failure.
 *
 * These tests force throws via module-level mocks (push) and a
 * direct throwing handler (command).
 */

// Mock the destination module so pushToDestinations throws, while
// createPushResult stays real (push.ts needs it for the onError
// return value).
jest.mock('../destination', () => {
  const actual = jest.requireActual('../destination');
  return {
    ...actual,
    pushToDestinations: jest.fn(),
  };
});

// Pull mocked functions and real createPush AFTER jest.mock is set up.
import { pushToDestinations } from '../destination';
import { createPush } from '../push';
import { createCommand } from '../command';

type MockedPushToDestinations = jest.MockedFunction<typeof pushToDestinations>;

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
      dropped: { queue: 0, queuePush: 0, dlq: 0 },
    },
  } as unknown as Collector.Instance;
}

describe('push boundary', () => {
  const mockedPushToDestinations =
    pushToDestinations as MockedPushToDestinations;

  beforeEach(() => {
    mockedPushToDestinations.mockReset();
  });

  test('logs and counts when a pipeline error is thrown', async () => {
    const collector = collectorWithIdentity();
    const push = createPush(collector, identityPrepare);

    mockedPushToDestinations.mockImplementation(() => {
      throw new Error('boom');
    });

    const event: WalkerOS.DeepPartialEvent = { name: 'page view' };
    const ingest = createIngest('test-source');

    const result = await push(event, { id: 'test-source', ingest });

    expect(result.ok).toBe(false);
    expect(collector.status.failed).toBe(1);

    const errorMock = (collector.logger as ReturnType<typeof createMockLogger>)
      .error as jest.Mock;
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith(
      'push failed',
      expect.objectContaining({
        event,
        ingest,
        error: expect.any(Error),
      }),
    );
  });

  test('does not log or count when push succeeds', async () => {
    const collector = collectorWithIdentity();
    const push = createPush(collector, identityPrepare);

    mockedPushToDestinations.mockResolvedValue({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    } as unknown as Awaited<ReturnType<typeof pushToDestinations>>);

    const result = await push({ name: 'page view' }, { id: 'test-source' });

    expect(result.ok).toBe(true);
    expect(collector.status.failed).toBe(0);

    const errorMock = (collector.logger as ReturnType<typeof createMockLogger>)
      .error as jest.Mock;
    expect(errorMock).not.toHaveBeenCalled();
  });

  test('rethrows FatalError without logging or counting', async () => {
    const collector = collectorWithIdentity();
    const push = createPush(collector, identityPrepare);

    const fatal = new FatalError('intentional abort');
    mockedPushToDestinations.mockImplementation(() => {
      throw fatal;
    });

    await expect(
      push({ name: 'page view' }, { id: 'test-source' }),
    ).rejects.toBe(fatal);

    expect(collector.status.failed).toBe(0);

    const errorMock = (collector.logger as ReturnType<typeof createMockLogger>)
      .error as jest.Mock;
    expect(errorMock).not.toHaveBeenCalled();
  });
});

describe('command boundary', () => {
  test('logs and counts when a command handler throws', async () => {
    const collector = createTestCollector();
    const throwingHandler = jest.fn(async () => {
      throw new Error('handler exploded');
    });

    const command = createCommand(collector, throwingHandler);

    const data = { foo: 'bar' };
    const result = await command('walker hook', data);

    expect(result.ok).toBe(false);
    expect(collector.status.failed).toBe(1);

    const errorMock = (collector.logger as ReturnType<typeof createMockLogger>)
      .error as jest.Mock;
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith(
      'command failed',
      expect.objectContaining({
        command: 'walker hook',
        data,
        error: expect.any(Error),
      }),
    );
  });

  test('does not log or count when command succeeds', async () => {
    const collector = createTestCollector();
    const successHandler = jest.fn(async () => ({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    }));

    const command = createCommand(
      collector,
      successHandler as unknown as Parameters<typeof createCommand>[1],
    );

    const result = await command('walker run', undefined);

    expect(result.ok).toBe(true);
    expect(collector.status.failed).toBe(0);

    const errorMock = (collector.logger as ReturnType<typeof createMockLogger>)
      .error as jest.Mock;
    expect(errorMock).not.toHaveBeenCalled();
  });

  test('rethrows FatalError without logging or counting', async () => {
    const collector = createTestCollector();
    const fatal = new FatalError('cannot recover');
    const fatalHandler = jest.fn(async () => {
      throw fatal;
    });

    const command = createCommand(collector, fatalHandler);

    await expect(command('walker hook', undefined)).rejects.toBe(fatal);

    expect(collector.status.failed).toBe(0);

    const errorMock = (collector.logger as ReturnType<typeof createMockLogger>)
      .error as jest.Mock;
    expect(errorMock).not.toHaveBeenCalled();
  });
});

// --- helpers ---

function identityPrepare(
  event: WalkerOS.DeepPartialEvent,
): WalkerOS.PartialEvent {
  return event as WalkerOS.PartialEvent;
}

function collectorWithIdentity(): Collector.Instance {
  return createTestCollector();
}
