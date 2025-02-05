import { debounce, throttle } from '../core';

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

      fn('immediate');
      expect(mockFn).toHaveBeenCalledWith('immediate');
      expect(mockFn).toHaveBeenCalledTimes(1);

      fn('delayed');
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);

      fn('reloaded');
      expect(mockFn).toHaveBeenCalledWith('reloaded');
      expect(mockFn).toHaveBeenCalledTimes(2);
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
