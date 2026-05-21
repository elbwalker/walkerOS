import { debounce, throttle } from '..';

describe('Invocations', () => {
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('debounce', () => {
    test('default behavior', async () => {
      const fn = debounce(mockFn);

      fn();
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalled();
    });

    test('custom wait time', async () => {
      const fn = debounce(mockFn, 50);

      fn();
      expect(mockFn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(49);
      expect(mockFn).not.toHaveBeenCalled();
      fn();
      jest.advanceTimersByTime(2);
      expect(mockFn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(99);
      expect(mockFn).toHaveBeenCalled();
    });

    test('passes arguments correctly', async () => {
      const fn = debounce(mockFn, 50);
      fn('arg');
      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledWith('arg');
    });

    test('immediate execution', async () => {
      const fn = debounce(mockFn, 50, true);

      fn('immediately');
      expect(mockFn).toHaveBeenCalledWith('immediately');
      expect(mockFn).toHaveBeenCalledTimes(1);

      fn('delayed');
      jest.advanceTimersByTime(10);
      fn('delayed');
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('delayed');

      fn('reloaded');
      fn('reloaded');
      fn('reloaded');
      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledWith('reloaded');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    test('options form: wait only', () => {
      const fn = debounce(mockFn, { wait: 50 });
      fn('a');
      jest.advanceTimersByTime(49);
      expect(mockFn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(mockFn).toHaveBeenCalledWith('a');
    });

    test('options form: size cap flushes immediately', () => {
      const fn = debounce(mockFn, { wait: 1000, size: 3 });
      fn('a');
      fn('b');
      expect(mockFn).not.toHaveBeenCalled();
      fn('c'); // third call hits size cap
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('c');
      // Window resets; size counter zeroed
      fn('d');
      fn('e');
      fn('f');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('f');
    });

    test('options form: age cap fires even when debounce keeps resetting', () => {
      const fn = debounce(mockFn, { wait: 50, age: 200 });
      fn('first');
      // Keep resetting the debounce window every 40ms
      for (let i = 0; i < 4; i++) {
        jest.advanceTimersByTime(40);
        fn('reset-' + i);
      }
      // Total elapsed >= 160ms here; advance to 200ms total to trigger age cap
      jest.advanceTimersByTime(40);
      expect(mockFn).toHaveBeenCalledTimes(1);
      // After age fires, the most recent args are used
      expect(mockFn).toHaveBeenLastCalledWith('reset-3');
    });

    test('flush() drains pending call immediately', async () => {
      const fn = debounce(mockFn, { wait: 1000 });
      fn('pending');
      expect(mockFn).not.toHaveBeenCalled();
      await fn.flush();
      expect(mockFn).toHaveBeenCalledWith('pending');
    });

    test('flush() with no pending call is a no-op', async () => {
      const fn = debounce(mockFn, { wait: 1000 });
      const result = await fn.flush();
      expect(result).toBeUndefined();
      expect(mockFn).not.toHaveBeenCalled();
    });

    test('cancel() drops pending invocation', async () => {
      const fn = debounce(mockFn, { wait: 1000 });
      const p = fn('dropped');
      fn.cancel();
      jest.advanceTimersByTime(2000);
      expect(mockFn).not.toHaveBeenCalled();
      await expect(p).resolves.toBeUndefined();
    });

    test('size() reports scheduled calls in current window', () => {
      const fn = debounce(mockFn, { wait: 100 });
      expect(fn.size()).toBe(0);
      fn('a');
      fn('b');
      expect(fn.size()).toBe(2);
      jest.advanceTimersByTime(100);
      // Window flushed; counter resets
      expect(fn.size()).toBe(0);
    });

    test('single-flight: flush() during pending call dedupes', async () => {
      const fn = debounce(mockFn, { wait: 1000 });
      const p1 = fn('x');
      const p2 = fn.flush();
      // Both should resolve with same single fn invocation
      await Promise.all([p1, p2]);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  test('throttle', () => {
    const fn = throttle(mockFn, 50);

    fn();
    expect(mockFn).toHaveBeenCalled();
    jest.clearAllMocks();

    fn();
    expect(mockFn).not.toHaveBeenCalled();
    jest.clearAllMocks();

    jest.advanceTimersByTime(50);

    fn();
    expect(mockFn).toHaveBeenCalled();
    jest.clearAllMocks();

    jest.advanceTimersByTime(50);

    fn('arg');
    expect(mockFn).toHaveBeenCalledWith('arg');
  });
});
