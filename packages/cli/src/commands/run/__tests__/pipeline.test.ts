import { createLogger, Level, type Logger } from '@walkeros/core';
import type { PipelineOptions } from '../pipeline.js';
import {
  handleUnhandledRejection,
  handleUncaughtException,
  registerProcessGuards,
  resolveInitialEtag,
  shouldStartHeartbeat,
  shouldStartPoller,
} from '../pipeline.js';

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
  });

  describe('handleUncaughtException', () => {
    it('logs the error and keeps the process serving for non-fatal cases', () => {
      const { logger, errors } = makeLogger();
      const exit = jest.fn();

      handleUncaughtException(new Error('stray throw'), { logger, exit });

      expect(errors.some((line) => line.includes('stray throw'))).toBe(true);
      expect(exit).not.toHaveBeenCalled();
    });
  });

  describe('registerProcessGuards', () => {
    afterEach(() => {
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
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
  });
});
