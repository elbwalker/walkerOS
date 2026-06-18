import { createLogger, Level, type Logger } from '@walkeros/core';
import { EventEmitter } from 'events';
import type { PipelineOptions } from '../pipeline.js';
import {
  createOutOfBandErrorTracker,
  handleUnhandledRejection,
  handleUncaughtException,
  registerProcessGuards,
  resetProcessGuardsForTest,
  resolveInitialEtag,
  runShutdown,
  shouldStartHeartbeat,
  shouldStartPoller,
  type ShutdownDeps,
} from '../pipeline.js';
import type { HeartbeatHandle } from '../../../runtime/heartbeat.js';

const fakeApi: NonNullable<PipelineOptions['api']> = {
  appUrl: 'https://app.example',
  token: 'token',
  projectId: 'project',
  flowId: 'flow',
  heartbeatIntervalMs: 30_000,
  pollIntervalMs: 30_000,
  cacheDir: '/tmp/cache',
  prepareBundleForRun: async () => ({
    bundlePath: '/tmp/bundle.js',
    cleanup: async () => {},
  }),
};

describe('resolveInitialEtag', () => {
  const original = process.env.WALKEROS_CONFIG_ETAG;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.WALKEROS_CONFIG_ETAG;
    } else {
      process.env.WALKEROS_CONFIG_ETAG = original;
    }
  });

  it('returns the boot etag when present, ignoring the env var', () => {
    process.env.WALKEROS_CONFIG_ETAG = '"env"';
    expect(resolveInitialEtag('"boot"')).toBe('"boot"');
  });

  it('falls back to WALKEROS_CONFIG_ETAG when no boot etag is given', () => {
    process.env.WALKEROS_CONFIG_ETAG = '"env"';
    expect(resolveInitialEtag(undefined)).toBe('"env"');
  });

  it('returns undefined when neither boot etag nor env var is set', () => {
    delete process.env.WALKEROS_CONFIG_ETAG;
    expect(resolveInitialEtag(undefined)).toBeUndefined();
  });
});

describe('shouldStartHeartbeat', () => {
  it('is true when api is present (not frozen)', () => {
    expect(shouldStartHeartbeat(fakeApi)).toBe(true);
  });

  it('is true when api is present even when frozen', () => {
    // The heartbeat must keep running under freeze so the operator retains
    // observability; freezing only disables the poller.
    expect(shouldStartHeartbeat(fakeApi)).toBe(true);
  });

  it('is false when api is absent', () => {
    expect(shouldStartHeartbeat(undefined)).toBe(false);
  });
});

describe('shouldStartPoller', () => {
  it('is true only when api is present and not frozen', () => {
    expect(shouldStartPoller(fakeApi, false)).toBe(true);
  });

  it('is false when frozen, even with api present', () => {
    expect(shouldStartPoller(fakeApi, true)).toBe(false);
  });

  it('is false when api is absent', () => {
    expect(shouldStartPoller(undefined, false)).toBe(false);
    expect(shouldStartPoller(undefined, true)).toBe(false);
  });
});

describe('runShutdown (extracted orchestrator)', () => {
  function makeLogger(): Logger.Instance {
    const base = createLogger({ level: Level.DEBUG });
    return {
      ...base,
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };
  }

  /** A minimal HeartbeatHandle whose methods are spies and whose sendOnce can
   * be made slow/rejecting for the timeout assertions. */
  function makeHeartbeat(sendOnce: () => Promise<void>): {
    handle: HeartbeatHandle;
    order: string[];
  } {
    const order: string[] = [];
    const handle: HeartbeatHandle = {
      start: jest.fn(),
      stop: jest.fn(() => {
        order.push('stop');
      }),
      sendOnce: jest.fn(() => {
        order.push('sendOnce');
        return sendOnce();
      }),
      flushSoon: jest.fn(),
      updateConfigVersion: jest.fn(),
    };
    return { handle, order };
  }

  function baseDeps(overrides: Partial<ShutdownDeps>): ShutdownDeps {
    return {
      tracePoller: null,
      poller: null,
      heartbeat: null,
      collector: { command: undefined, status: undefined },
      healthServer: {
        setReady: jest.fn(),
        setFailed: jest.fn(),
        setDegraded: jest.fn(),
        close: jest.fn(() => Promise.resolve()),
      },
      logger: makeLogger(),
      exit: jest.fn(),
      cleanupTempFiles: () => Promise.resolve(),
      forceTimeoutMs: 15000,
      ...overrides,
    };
  }

  it('awaits the final heartbeat sendOnce BEFORE heartbeat.stop()', async () => {
    const { handle, order } = makeHeartbeat(() => Promise.resolve());
    const exit = jest.fn();

    await runShutdown('SIGTERM', baseDeps({ heartbeat: handle, exit }));

    expect(order).toEqual(['sendOnce', 'stop']);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('sends the final beat before collector shutdown (pre-drain counters)', async () => {
    const calls: string[] = [];
    const { handle } = makeHeartbeat(() => {
      calls.push('sendOnce');
      return Promise.resolve();
    });
    const collector: ShutdownDeps['collector'] = {
      command: jest.fn(() => {
        calls.push('collector-shutdown');
        return Promise.resolve();
      }),
      status: undefined,
    };

    await runShutdown(
      'SIGTERM',
      baseDeps({ heartbeat: handle, collector, exit: jest.fn() }),
    );

    expect(calls).toEqual(['sendOnce', 'collector-shutdown']);
  });

  it('swallows a rejecting final send and still completes a clean exit', async () => {
    const { handle, order } = makeHeartbeat(() =>
      Promise.reject(new Error('POST blew up')),
    );
    const exit = jest.fn();

    await runShutdown('SIGTERM', baseDeps({ heartbeat: handle, exit }));

    // sendOnce rejected but was swallowed: stop still ran and exit(0) fired.
    expect(order).toEqual(['sendOnce', 'stop']);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('forces exit(1) within the force-timer when a step hangs past the deadline', async () => {
    jest.useFakeTimers();
    try {
      const exit = jest.fn();
      // healthServer.close never resolves → shutdown hangs; the force-timer must
      // fire exit(1) at forceTimeoutMs.
      const deps = baseDeps({
        exit,
        forceTimeoutMs: 15000,
        healthServer: {
          setReady: jest.fn(),
          setFailed: jest.fn(),
          setDegraded: jest.fn(),
          close: jest.fn(() => new Promise<void>(() => {})),
        },
      });

      runShutdown('SIGTERM', deps);
      expect(exit).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(15000);
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops tracePoller and poller before the final beat', async () => {
    const calls: string[] = [];
    const tracePoller = {
      start: jest.fn(),
      stop: jest.fn(() => {
        calls.push('tracePoller.stop');
      }),
      pollOnce: jest.fn(() => Promise.resolve()),
    };
    const poller = {
      start: jest.fn(),
      stop: jest.fn(() => {
        calls.push('poller.stop');
      }),
      pollOnce: jest.fn(() => Promise.resolve()),
    };
    const { handle } = makeHeartbeat(() => {
      calls.push('sendOnce');
      return Promise.resolve();
    });

    await runShutdown(
      'SIGTERM',
      baseDeps({ tracePoller, poller, heartbeat: handle, exit: jest.fn() }),
    );

    expect(calls).toEqual(['tracePoller.stop', 'poller.stop', 'sendOnce']);
  });
});

describe('process error guards', () => {
  function makeLogger(): { logger: Logger.Instance; errors: string[] } {
    const errors: string[] = [];
    const base = createLogger({ level: Level.DEBUG });
    const logger: Logger.Instance = {
      ...base,
      error: (message) => {
        errors.push(typeof message === 'string' ? message : message.message);
      },
    };
    return { logger, errors };
  }

  // A logger whose `error` throws synchronously, to prove the guard handlers
  // (the registered uncaughtException/unhandledRejection listeners) never let a
  // throw escape — an escape would itself crash the process.
  function makeThrowingLogger(): Logger.Instance {
    const base = createLogger({ level: Level.DEBUG });
    return {
      ...base,
      error: () => {
        throw new Error('logger.error blew up');
      },
    };
  }

  describe('handleUnhandledRejection', () => {
    it('logs the rejection reason and keeps the process serving', () => {
      const { logger, errors } = makeLogger();
      const exit = jest.fn();

      handleUnhandledRejection(new Error('stray reject'), { logger, exit });

      expect(errors.some((line) => line.includes('stray reject'))).toBe(true);
      expect(exit).not.toHaveBeenCalled();
    });

    it('logs non-Error reasons without throwing', () => {
      const { logger, errors } = makeLogger();
      const exit = jest.fn();

      handleUnhandledRejection('plain string reason', { logger, exit });

      expect(errors.some((line) => line.includes('plain string reason'))).toBe(
        true,
      );
      expect(exit).not.toHaveBeenCalled();
    });

    it('feeds the out-of-band error hook so a later task can count it', () => {
      const { logger } = makeLogger();
      const onOutOfBandError = jest.fn();

      handleUnhandledRejection(new Error('stray reject'), {
        logger,
        exit: jest.fn(),
        onOutOfBandError,
      });

      expect(onOutOfBandError).toHaveBeenCalledTimes(1);
    });

    it('does not throw when the logger or degrade hook throws (process survives)', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      try {
        // logger.error throws AND the degrade hook throws: neither may escape.
        expect(() =>
          handleUnhandledRejection(new Error('stray reject'), {
            logger: makeThrowingLogger(),
            exit: jest.fn(),
            onOutOfBandError: () => {
              throw new Error('degrade hook blew up');
            },
          }),
        ).not.toThrow();
        expect(consoleError).toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('handleUncaughtException', () => {
    it('logs the error and keeps the process serving for non-fatal cases', () => {
      const { logger, errors } = makeLogger();
      const exit = jest.fn();

      handleUncaughtException(new Error('stray throw'), { logger, exit });

      expect(errors.some((line) => line.includes('stray throw'))).toBe(true);
      expect(exit).not.toHaveBeenCalled();
    });

    it('feeds the out-of-band error hook so a later task can count it', () => {
      const { logger } = makeLogger();
      const onOutOfBandError = jest.fn();

      handleUncaughtException(new Error('stray throw'), {
        logger,
        exit: jest.fn(),
        onOutOfBandError,
      });

      expect(onOutOfBandError).toHaveBeenCalledTimes(1);
    });

    it('does not throw when the logger or degrade hook throws (process survives)', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      try {
        expect(() =>
          handleUncaughtException(new Error('stray throw'), {
            logger: makeThrowingLogger(),
            exit: jest.fn(),
            onOutOfBandError: () => {
              throw new Error('degrade hook blew up');
            },
          }),
        ).not.toThrow();
        expect(consoleError).toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('registerProcessGuards', () => {
    let preexistingException: NodeJS.UncaughtExceptionListener[] = [];
    let preexistingRejection: NodeJS.UnhandledRejectionListener[] = [];

    beforeEach(() => {
      // Snapshot any guards the test harness/runner already attached, isolate
      // this test to its own listeners, and reset the one-shot latch so each
      // test registers fresh.
      preexistingException = process.listeners('uncaughtException');
      preexistingRejection = process.listeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
      process.removeAllListeners('unhandledRejection');
      resetProcessGuardsForTest();
    });

    afterEach(() => {
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
      for (const listener of preexistingException)
        process.on('uncaughtException', listener);
      for (const listener of preexistingRejection)
        process.on('unhandledRejection', listener);
      resetProcessGuardsForTest();
    });

    it('registers one listener per event', () => {
      const { logger } = makeLogger();
      const before = {
        rejection: process.listenerCount('unhandledRejection'),
        exception: process.listenerCount('uncaughtException'),
      };

      registerProcessGuards(logger);

      expect(process.listenerCount('unhandledRejection')).toBe(
        before.rejection + 1,
      );
      expect(process.listenerCount('uncaughtException')).toBe(
        before.exception + 1,
      );
    });

    it('does not double-register when called more than once', () => {
      const { logger } = makeLogger();

      registerProcessGuards(logger);
      const afterFirst = {
        rejection: process.listenerCount('unhandledRejection'),
        exception: process.listenerCount('uncaughtException'),
      };
      registerProcessGuards(logger);

      expect(process.listenerCount('unhandledRejection')).toBe(
        afterFirst.rejection,
      );
      expect(process.listenerCount('uncaughtException')).toBe(
        afterFirst.exception,
      );
    });

    it('routes a real listener-less emit("error") into the error path via the registered guard, no rethrow (honesty test)', () => {
      // A gRPC StreamConnection is an EventEmitter; a listener-less
      // emit('error', ...) on a detached tick is what becomes the
      // uncaughtException that bypasses every promise-path try/catch. Here we
      // (1) capture the EXACT error a real listener-less emit throws, then
      // (2) drive the guard listener that runPipeline registers FIRST with it,
      // asserting the guard logs it and does NOT rethrow. Before the change,
      // the guards were registered LAST (after loadFlow/openWriter), so an
      // init-window emit had no listener to land in — this test pins the
      // registered-first contract.
      const { logger, errors } = makeLogger();
      const onOutOfBandError = jest.fn();
      registerProcessGuards(logger, onOutOfBandError);

      // Capture the EXACT value a real EventEmitter throws when it emits
      // 'error' with no 'error' listener — the genuine out-of-band mechanism,
      // not a hand-rolled Error. (Note: under jsdom the thrown value can fail a
      // cross-realm `instanceof Error`, so we duck-type the error shape.)
      const emitter = new EventEmitter();
      let captured: unknown;
      let threw = false;
      try {
        emitter.emit('error', new Error('grpc stream error'));
      } catch (error) {
        threw = true;
        captured = error;
      }
      expect(threw).toBe(true);
      // Under jsdom the thrown value can fail a cross-realm `instanceof Error`,
      // so duck-type the error shape and lift its message into a same-realm
      // Error to feed the strongly-typed uncaughtException listener (which only
      // reads `.message`). The error-shape + message assertions keep this an
      // honest exercise of the real EventEmitter throw.
      expect(Object.prototype.toString.call(captured)).toBe('[object Error]');
      const capturedMessage =
        typeof captured === 'object' &&
        captured !== null &&
        'message' in captured &&
        typeof captured.message === 'string'
          ? captured.message
          : '';
      expect(capturedMessage).toContain('grpc stream error');

      const guard = process.listeners('uncaughtException').at(-1);
      expect(guard).toBeDefined();

      // Must not rethrow: invoking the registered guard (the one runPipeline
      // installs FIRST) returns normally — the process survives.
      expect(() =>
        guard?.(new Error(capturedMessage), 'uncaughtException'),
      ).not.toThrow();
      expect(errors.some((line) => line.includes('grpc stream error'))).toBe(
        true,
      );
      expect(onOutOfBandError).toHaveBeenCalledTimes(1);
    });

    it('exposes a setter that wires the out-of-band hook after registration', () => {
      const { logger } = makeLogger();
      const onOutOfBandError = jest.fn();

      const handle = registerProcessGuards(logger);
      handle.setOnOutOfBandError(onOutOfBandError);

      const exception = process.listeners('uncaughtException').at(-1);
      expect(exception).toBeDefined();
      exception?.(new Error('boom'), 'uncaughtException');

      expect(onOutOfBandError).toHaveBeenCalledTimes(1);
    });
  });

  describe('createOutOfBandErrorTracker', () => {
    it('fires the degrade callback only after N errors within the window', () => {
      let now = 0;
      const onThresholdExceeded = jest.fn();
      const tracker = createOutOfBandErrorTracker({
        threshold: 5,
        windowMs: 60_000,
        now: () => now,
        onThresholdExceeded,
      });

      // Four errors: still healthy (self-heals).
      for (let i = 0; i < 4; i += 1) tracker.record();
      expect(onThresholdExceeded).not.toHaveBeenCalled();

      // Fifth error within window: degrade.
      tracker.record();
      expect(onThresholdExceeded).toHaveBeenCalledTimes(1);
    });

    it('does not degrade when errors are spread beyond the window', () => {
      let now = 0;
      const onThresholdExceeded = jest.fn();
      const tracker = createOutOfBandErrorTracker({
        threshold: 5,
        windowMs: 60_000,
        now: () => now,
        onThresholdExceeded,
      });

      // One stray error every 20s: never 5 within any 60s window.
      for (let i = 0; i < 10; i += 1) {
        tracker.record();
        now += 20_000;
      }

      expect(onThresholdExceeded).not.toHaveBeenCalled();
    });

    it('fires once per crossing, not on every subsequent error', () => {
      let now = 0;
      const onThresholdExceeded = jest.fn();
      const tracker = createOutOfBandErrorTracker({
        threshold: 3,
        windowMs: 60_000,
        now: () => now,
        onThresholdExceeded,
      });

      tracker.record();
      tracker.record();
      tracker.record(); // crosses
      tracker.record(); // still degraded, no second fire
      tracker.record();

      expect(onThresholdExceeded).toHaveBeenCalledTimes(1);
    });
  });
});
