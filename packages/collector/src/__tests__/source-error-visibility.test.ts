import type { Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { startFlow } from '..';
import { initSources, flushSourceQueueOn } from '../source';

/**
 * Source error visibility: throws during source factory, source init,
 * and queued-on flush MUST log via the scoped 'source' logger AND
 * increment `collector.status.failed` (Category A - internal pipeline
 * failures).
 *
 * Additionally, a source whose `init()` throws MUST stay with
 * `config.init === false` so operators see it stuck.
 */

describe('source factory throws (Category A)', () => {
  test('logs and counts when the source factory code throws', async () => {
    const { collector } = await startFlow({
      logger: { handler: () => undefined },
    });

    // Inject a single source whose factory throws via initSources.
    // startFlow already initialized sources; we test the underlying
    // initSource helper directly.
    installMockLogger(collector);

    await initSources(collector, {
      bad: {
        code: () => {
          throw new Error('factory boom');
        },
      } as Source.InitSource,
    });

    expect(collector.status.failed).toBe(1);
    expect(collector.sources.bad).toBeUndefined();

    const errorCall = findLoggerError(collector, 'source factory failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        sourceId: 'bad',
        error: expect.any(Error),
      }),
    );
  });
});

describe('source init throws (Category A)', () => {
  test('logs, counts, and keeps config.init === false', async () => {
    const { collector } = await startFlow({
      logger: { handler: () => undefined },
    });
    installMockLogger(collector);

    await initSources(collector, {
      stuck: {
        code: () => ({
          type: 'mock',
          config: {},
          push: jest.fn(),
          init: () => {
            throw new Error('init boom');
          },
        }),
      } as Source.InitSource,
    });

    expect(collector.status.failed).toBe(1);

    // Load-bearing: the source MUST stay un-initialized.
    expect(collector.sources.stuck).toBeDefined();
    expect(collector.sources.stuck.config.init).toBe(false);

    const errorCall = findLoggerError(collector, 'source init failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        sourceId: 'stuck',
        error: expect.any(Error),
      }),
    );
  });
});

describe('source queued on flush throws (Category A)', () => {
  test('logs and counts when the on() callback throws during flush', async () => {
    const { collector } = await startFlow({
      logger: { handler: () => undefined },
    });
    installMockLogger(collector);

    // Build a source instance whose `on` throws, with a queued entry.
    const instance = {
      type: 'mock',
      config: { id: 'flushy', init: true },
      push: jest.fn(),
      on: () => {
        throw new Error('on boom');
      },
      queueOn: [{ type: 'consent' as const, data: { marketing: true } }],
    } as unknown as Source.Instance;

    await flushSourceQueueOn(collector, instance);

    expect(collector.status.failed).toBe(1);

    const errorCall = findLoggerError(collector, 'source on flush failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        type: 'consent',
        error: expect.any(Error),
      }),
    );
  });
});

// --- helpers ---

/**
 * Replace the collector's real logger with a fresh mock logger so test
 * assertions can inspect scoped error calls. Resets the status.failed
 * counter to a known baseline (startFlow may have logged nothing, but
 * we want a clean slate for the per-test assertion).
 *
 * `Logger.Instance` and `MockLogger` are structurally compatible at the
 * interface level (`MockLogger extends Instance`), but `Logger.Instance`
 * does not declare the `scopedLoggers` array we need for assertions.
 * Write through `Object.assign` so TS infers the union and lets us read
 * `scopedLoggers` later via `findLoggerError`'s narrowing.
 */
function installMockLogger(collector: Collector.Instance): void {
  Object.assign(collector, { logger: createMockLogger() });
  collector.status.failed = 0;
}

/**
 * Walk the mock-logger tree looking for an `.error` call whose first
 * argument exactly matches `verb`. Source code calls scoped loggers
 * (`logger.scope('source').error(...)`), so we must check children.
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
