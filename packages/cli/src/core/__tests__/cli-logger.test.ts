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

describe('handler context serialization', () => {
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

  it('appends serialized context to the line, on console and the onLine tap', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => {
        captured.push(message);
      },
    });

    logger.scope('gcp-bigquery').error('connection error', {
      error: 'Total timeout exceeded',
      code: 4,
      name: 'GoogleError',
    });

    const expected =
      '[gcp-bigquery] connection error ' +
      '{"error":"Total timeout exceeded","code":4,"name":"GoogleError"}';
    expect(captured).toEqual([expected]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"code":4'));
  });

  it('leaves lines without context untouched (no trailing braces)', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => {
        captured.push(message);
      },
    });

    logger.error('boom');

    expect(captured).toEqual(['boom']);
  });

  it('redacts secret-shaped values inside the serialized context', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => {
        captured.push(message);
      },
    });

    // A >=20-char mixed-alphanumeric run trips the standalone-token rule in
    // scrubSecrets, proving redaction runs AFTER context is appended.
    logger.error('auth failed', { token: 'c2VjcmV0dG9rZW4xMjM0NTY3ODk' });

    expect(captured[0]).not.toContain('c2VjcmV0');
    expect(captured[0]).toContain('***');
  });

  it('does not throw on circular context and emits a fallback marker', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => {
        captured.push(message);
      },
    });

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => logger.error('boom', circular)).not.toThrow();
    expect(captured[0]).toBe('boom [unserializable context]');
  });

  it('pins the serialization contract: primitive-valued context round-trips, raw Error is documented-unsupported', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => {
        captured.push(message);
      },
    });

    // The errorMeta pattern (Task 3): primitive values, fully serialized.
    logger.error('connection error', {
      error: 'Deadline exceeded',
      name: 'GoogleError',
      code: 4,
    });
    expect(captured[0]).toBe(
      'connection error {"error":"Deadline exceeded","name":"GoogleError","code":4}',
    );

    // Raw Error instances are unsupported input: JSON semantics apply (a plain
    // Error has no enumerable own props -> {}). Pinned so the behavior is a
    // documented contract, not a surprise.
    logger.error('bad call site', { err: new Error('nope') });
    expect(captured[1]).toBe('bad call site {"err":{}}');
  });
});
