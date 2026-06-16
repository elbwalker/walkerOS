import { createLogger, Level } from '@walkeros/core';
import { createCLILoggerConfig } from '../cli-logger.js';
import { ErrorRing, LogRing } from '../../runtime/index.js';

/**
 * D1: the collector logger config must feed the SAME ring tap the runner CLI
 * logger uses, so a deployed bundle's destination errors land in the
 * ErrorRing (and therefore the heartbeat report). These tests drive the
 * config through `createLogger` exactly as the collector does.
 */
describe('createCLILoggerConfig (collector ring tap)', () => {
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('routes a scoped destination error into the error ring (no --verbose)', () => {
    const errorRing = new ErrorRing(20);
    const logRing = new LogRing(100);

    const config = createCLILoggerConfig({
      verbose: false,
      silent: true,
      onLine: (level, message) => {
        if (level === Level.ERROR) errorRing.add(message);
        logRing.add({ time: Date.now(), level: 'error', message });
      },
    });

    // Drive the collector path: scoped destination logger emits "Push failed".
    const collectorLogger = createLogger(config);
    collectorLogger
      .scope('bq')
      .error('Push failed', { event: 'order complete' });

    const snapshot = errorRing.snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].message).toBe('[bq] Push failed');
    expect(snapshot[0].count).toBe(1);
  });

  it('sets the level to at least ERROR so errors emit without --verbose', () => {
    const config = createCLILoggerConfig({ verbose: false, silent: true });
    expect(config.level).toBeDefined();
    // Level.ERROR is 0; "at least ERROR" means the gate admits ERROR.
    const numericLevel =
      typeof config.level === 'number'
        ? config.level
        : Level[config.level as keyof typeof Level];
    expect(numericLevel).toBeGreaterThanOrEqual(Level.ERROR);
  });

  it('does not pollute the error ring with non-error levels', () => {
    const errorRing = new ErrorRing(20);
    const logRing = new LogRing(100);

    const config = createCLILoggerConfig({
      verbose: true,
      silent: false,
      onLine: (level, message) => {
        if (level === Level.ERROR) errorRing.add(message);
        logRing.add({
          time: Date.now(),
          level:
            level === Level.ERROR
              ? 'error'
              : level === Level.WARN
                ? 'warn'
                : level === Level.INFO
                  ? 'info'
                  : 'debug',
          message,
        });
      },
    });

    const logger = createLogger(config);
    logger.info('just info');
    logger.warn('a warning');
    logger.error('a real error');

    // Only the error lands in the error ring.
    const errors = errorRing.snapshot();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('a real error');

    // Non-error levels still reach the log ring (existing behavior).
    const logs = logRing.snapshot();
    expect(logs.map((l) => l.message)).toEqual([
      'just info',
      'a warning',
      'a real error',
    ]);
  });

  it('uses the identical handler as createCLILogger (no parallel ring)', () => {
    // The config's handler IS the same function the CLI logger uses, so a
    // single onLine tap feeds both runner-process logs and collector logs.
    const lines: Array<{ level: Level; message: string }> = [];
    const onLine = (level: Level, message: string) => {
      lines.push({ level, message });
    };

    const config = createCLILoggerConfig({ verbose: false, onLine });
    const collectorLogger = createLogger(config);
    collectorLogger.scope('gtag').error('boom');

    expect(lines).toEqual([{ level: Level.ERROR, message: '[gtag] boom' }]);
  });
});
