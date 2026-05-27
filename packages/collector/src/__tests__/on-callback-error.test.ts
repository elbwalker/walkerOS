import type { Collector, Destination, On, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { startFlow } from '..';
import { callDestinationOn, onApply } from '../on';

/**
 * on() user-callback error visibility: when a user-supplied callback
 * throws inside any of the seven sites in `on.ts`, the wrap MUST log
 * via the scoped 'on' logger but MUST NOT increment `status.failed`
 * (Category B - user code throwing is a user-code bug, not a pipeline
 * health signal).
 *
 * Seven sites: destination.on (75), generic on rule (147), source.on
 * via onApply (220), consent key rule (274), onReady (286),
 * onRun (294), onSession (305).
 */

async function setupCollector(): Promise<Collector.Instance> {
  const { collector } = await startFlow({
    logger: { handler: () => undefined },
  });
  // Replace the real logger with a mock for inspectable scope tracking.
  // Object.assign avoids tripping the structural-compatibility check on
  // the `Logger.Instance` -> `MockLogger` narrowing in Collector.Instance.
  Object.assign(collector, { logger: createMockLogger() });
  collector.status.failed = 0;
  return collector;
}

describe('on.ts user-callback throws (Category B)', () => {
  test('callDestinationOn logs and does NOT count when destination.on throws', () => {
    // Synchronous setup — startFlow not needed for this site since
    // callDestinationOn is invoked directly.
    const mockLogger = createMockLogger();
    const collector = {
      logger: mockLogger,
      observers: new Set(),
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

    const destination = {
      type: 'mock',
      config: {},
      push: jest.fn(),
      on: () => {
        throw new Error('dest on boom');
      },
    } as unknown as Destination.Instance;

    callDestinationOn(collector, destination, 'd1', 'consent', {
      marketing: true,
    });

    expect(collector.status.failed).toBe(0);
    const errorCall = findLoggerError(collector, 'on callback failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'destination',
        error: expect.any(Error),
      }),
    );
  });

  test('generic on rule logs and does NOT count when callback throws', async () => {
    const collector = await setupCollector();

    const throwing: On.GenericFn = () => {
      throw new Error('generic boom');
    };

    // Register a custom-event callback then trigger it via onApply.
    // 'user' is one of the generic-handler types in fireCallbacks.
    await onApply(collector, 'user', [throwing], { id: 'u1' });

    expect(collector.status.failed).toBe(0);
    const errorCall = findLoggerError(collector, 'on callback failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'generic',
        error: expect.any(Error),
      }),
    );
  });

  test('source.on (via onApply) logs and does NOT count when it throws', async () => {
    const collector = await setupCollector();

    // Inject a "started" source whose on() throws.
    const throwingSource: Source.Instance = {
      type: 'mock',
      config: { init: true },
      push: jest.fn(),
      on: () => {
        throw new Error('source on boom');
      },
    } as unknown as Source.Instance;
    collector.sources.thrower = throwingSource;

    await onApply(collector, 'consent', [], { marketing: true });

    expect(collector.status.failed).toBe(0);
    const errorCall = findLoggerError(collector, 'on callback failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'source',
        error: expect.any(Error),
      }),
    );
  });

  test('consent key rule logs and does NOT count when it throws', async () => {
    const collector = await setupCollector();

    const consentRule: On.ConsentRule = {
      marketing: () => {
        throw new Error('consent boom');
      },
    };

    await onApply(collector, 'consent', [consentRule], { marketing: true });

    expect(collector.status.failed).toBe(0);
    const errorCall = findLoggerError(collector, 'on callback failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'consent',
        error: expect.any(Error),
      }),
    );
  });

  test('onReady logs and does NOT count when callback throws', async () => {
    const collector = await setupCollector();
    collector.allowed = true;

    const ready: On.ReadyFn = () => {
      throw new Error('ready boom');
    };

    await onApply(collector, 'ready', [ready]);

    expect(collector.status.failed).toBe(0);
    const errorCall = findLoggerError(collector, 'on callback failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'ready',
        error: expect.any(Error),
      }),
    );
  });

  test('onRun logs and does NOT count when callback throws', async () => {
    const collector = await setupCollector();
    collector.allowed = true;

    const run: On.RunFn = () => {
      throw new Error('run boom');
    };

    await onApply(collector, 'run', [run]);

    expect(collector.status.failed).toBe(0);
    const errorCall = findLoggerError(collector, 'on callback failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'run',
        error: expect.any(Error),
      }),
    );
  });

  test('onSession logs and does NOT count when callback throws', async () => {
    const collector = await setupCollector();
    collector.session = {
      isStart: true,
    } as unknown as Collector.Instance['session'];

    const session: On.SessionFn = () => {
      throw new Error('session boom');
    };

    await onApply(collector, 'session', [session]);

    expect(collector.status.failed).toBe(0);
    const errorCall = findLoggerError(collector, 'on callback failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'session',
        error: expect.any(Error),
      }),
    );
  });
});

// --- helpers ---

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
