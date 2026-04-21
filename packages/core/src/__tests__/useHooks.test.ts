import type { Hooks, Logger } from '../types';
import { useHooks } from '../useHooks';

describe('useHooks', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('calls function normally without hooks', () => {
    const fn = jest.fn((a: number, b: number) => a + b);
    const wrapped = useHooks(fn, 'Test', {});
    expect(wrapped(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledWith(1, 2);
  });

  test('preHook wraps the function', () => {
    const fn = jest.fn((x: number) => x * 2);
    const preHook = jest.fn(
      ({ fn }: { fn: (x: number) => number }, x: number) => fn(x + 10),
    );
    const wrapped = useHooks(fn, 'Test', {
      preTest: preHook,
    } as unknown as Hooks.Functions);
    expect(wrapped(5)).toBe(30);
    expect(preHook).toHaveBeenCalled();
  });

  test('postHook receives result', () => {
    const fn = jest.fn((x: number) => x * 2);
    const postHook = jest.fn(
      (
        { result }: { fn: (x: number) => number; result?: number },
        _x: number,
      ) => (result || 0) + 1,
    );
    const wrapped = useHooks(fn, 'Test', {
      postTest: postHook,
    } as unknown as Hooks.Functions);
    expect(wrapped(5)).toBe(11);
    expect(postHook).toHaveBeenCalled();
  });

  test('preHook error falls back to original fn and warns via console', () => {
    const fn = jest.fn((x: number) => x * 2);
    const preHook = jest.fn(() => {
      throw new Error('preHook exploded');
    });
    const wrapped = useHooks(fn, 'Test', {
      preTest: preHook,
    } as unknown as Hooks.Functions);

    expect(wrapped(5)).toBe(10);
    expect(fn).toHaveBeenCalledWith(5);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('preTest'),
      expect.any(Error),
    );
  });

  test('postHook error returns original result and warns via console', () => {
    const fn = jest.fn((x: number) => x * 2);
    const postHook = jest.fn(() => {
      throw new Error('postHook exploded');
    });
    const wrapped = useHooks(fn, 'Test', {
      postTest: postHook,
    } as unknown as Hooks.Functions);

    expect(wrapped(5)).toBe(10);
    expect(fn).toHaveBeenCalledWith(5);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('postTest'),
      expect.any(Error),
    );
  });

  test('both hooks erroring keeps pipeline alive', () => {
    const fn = jest.fn((x: number) => x * 2);
    const preHook = jest.fn(() => {
      throw new Error('pre');
    });
    const postHook = jest.fn(() => {
      throw new Error('post');
    });
    const wrapped = useHooks(fn, 'Test', {
      preTest: preHook,
      postTest: postHook,
    } as unknown as Hooks.Functions);

    expect(wrapped(5)).toBe(10);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  test('uses logger.warn instead of console when logger provided', () => {
    const fn = jest.fn((x: number) => x * 2);
    const preHook = jest.fn(() => {
      throw new Error('pre');
    });
    const mockLogger = {
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      throw: jest.fn(),
      scope: jest.fn(),
      child: jest.fn(),
    } as unknown as Logger.Instance;

    const wrapped = useHooks(
      fn,
      'Test',
      { preTest: preHook } as unknown as Hooks.Functions,
      mockLogger,
    );

    expect(wrapped(5)).toBe(10);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('preTest'),
      expect.objectContaining({ error: expect.any(Error) }),
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
