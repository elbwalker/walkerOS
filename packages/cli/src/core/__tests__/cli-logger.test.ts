import { Level } from '@walkeros/core';
import { createCLILogger } from '../cli-logger.js';

describe('createCLILogger onLine hook', () => {
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

  it('captures ERROR, INFO, and scoped-child lines via onLine', () => {
    const captured: Array<{ level: Level; message: string }> = [];

    const logger = createCLILogger({
      onLine: (level, message) => {
        captured.push({ level, message });
      },
    });

    logger.error('boom');
    logger.info('hi');
    logger.scope('dest').error('nested');

    expect(captured).toHaveLength(3);
    expect(captured[0]).toEqual({ level: Level.ERROR, message: 'boom' });
    expect(captured[1]).toEqual({ level: Level.INFO, message: 'hi' });
    expect(captured[2]).toEqual({
      level: Level.ERROR,
      message: '[dest] nested',
    });
  });

  it('does not break logging if onLine throws', () => {
    const logger = createCLILogger({
      onLine: () => {
        throw new Error('consumer error');
      },
    });

    // Should not throw, and console.error should still be called for ERROR level
    expect(() => logger.error('boom')).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('works normally without onLine', () => {
    const logger = createCLILogger({ silent: false });

    expect(() => logger.info('hello')).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith('hello');
  });
});
