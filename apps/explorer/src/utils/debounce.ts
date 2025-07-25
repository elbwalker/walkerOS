/**
 * Performance Utilities - Debouncing, throttling, and other performance helpers
 *
 * Features:
 * - Debounce with immediate execution option
 * - Throttle for high-frequency events
 * - RAF-based scheduling
 * - Memory-efficient cleanup
 */

/**
 * Debounce function - delays execution until after delay milliseconds have elapsed
 * since the last time it was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate = false,
): {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
} {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastResult: ReturnType<T>;

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args;

    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (!immediate) {
        lastResult = func(...args);
      }
    }, delay);

    if (callNow) {
      lastResult = func(...args);
    }
  };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  debounced.flush = (): ReturnType<T> | undefined => {
    if (timeoutId && lastArgs) {
      debounced.cancel();
      lastResult = func(...lastArgs);
    }
    return lastResult;
  };

  return debounced;
}

/**
 * Throttle function - ensures function is called at most once per specified interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  interval: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): {
  (...args: Parameters<T>): void;
  cancel(): void;
} {
  const { leading = true, trailing = true } = options;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastArgs: Parameters<T> | undefined;

  const throttled = (...args: Parameters<T>): void => {
    const now = Date.now();

    if (!lastCallTime && !leading) {
      lastCallTime = now;
    }

    const remaining = interval - (now - (lastCallTime || 0));

    lastArgs = args;

    if (remaining <= 0 || remaining > interval) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      lastCallTime = now;
      func(...args);
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        lastCallTime = leading ? Date.now() : undefined;
        timeoutId = undefined;
        if (lastArgs) {
          func(...lastArgs);
        }
      }, remaining);
    }
  };

  throttled.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    lastCallTime = undefined;
  };

  return throttled;
}

/**
 * RAF-based throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T,
): {
  (...args: Parameters<T>): void;
  cancel(): void;
} {
  let rafId: number | undefined;
  let lastArgs: Parameters<T> | undefined;

  const throttled = (...args: Parameters<T>): void => {
    lastArgs = args;

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = undefined;
        if (lastArgs) {
          func(...lastArgs);
        }
      });
    }
  };

  throttled.cancel = (): void => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }
  };

  return throttled;
}

/**
 * Async debounce for promises
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number,
): {
  (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;
  cancel(): void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let pendingPromise: Promise<Awaited<ReturnType<T>>> | undefined;
  let resolvePending: ((value: Awaited<ReturnType<T>>) => void) | undefined;
  let rejectPending: ((reason: any) => void) | undefined;

  const debounced = (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise<Awaited<ReturnType<T>>>(
        (resolve, reject) => {
          resolvePending = resolve;
          rejectPending = reject;
        },
      );
    }

    timeoutId = setTimeout(async () => {
      try {
        const result = await func(...args);
        resolvePending?.(result);
      } catch (error) {
        rejectPending?.(error);
      } finally {
        timeoutId = undefined;
        pendingPromise = undefined;
        resolvePending = undefined;
        rejectPending = undefined;
      }
    }, delay);

    return pendingPromise;
  };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (rejectPending) {
      rejectPending(new Error('Debounced async function cancelled'));
      pendingPromise = undefined;
      resolvePending = undefined;
      rejectPending = undefined;
    }
  };

  return debounced;
}

/**
 * Batch multiple calls into a single execution
 */
export function batch<T>(
  func: (items: T[]) => void,
  maxBatchSize = 10,
  maxWaitTime = 100,
): {
  (item: T): void;
  flush(): void;
  cancel(): void;
} {
  let batch: T[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const flush = (): void => {
    if (batch.length > 0) {
      const currentBatch = batch;
      batch = [];

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      func(currentBatch);
    }
  };

  const batchedFunc = (item: T): void => {
    batch.push(item);

    if (batch.length >= maxBatchSize) {
      flush();
    } else if (!timeoutId) {
      timeoutId = setTimeout(flush, maxWaitTime);
    }
  };

  batchedFunc.flush = flush;

  batchedFunc.cancel = (): void => {
    batch = [];
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return batchedFunc;
}

/**
 * Memoize function results with optional TTL
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  options: {
    maxSize?: number;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {},
): T & { clear(): void; delete(...args: Parameters<T>): boolean } {
  const {
    maxSize = 100,
    ttl,
    keyGenerator = (...args) => JSON.stringify(args),
  } = options;

  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);
    const now = Date.now();

    const cached = cache.get(key);
    if (cached) {
      // Check TTL if specified
      if (!ttl || now - cached.timestamp < ttl) {
        return cached.value;
      } else {
        cache.delete(key);
      }
    }

    const result = func(...args);

    // Add to cache
    cache.set(key, { value: result, timestamp: now });

    // Enforce max size
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T & { clear(): void; delete(...args: Parameters<T>): boolean };

  memoized.clear = (): void => {
    cache.clear();
  };

  memoized.delete = (...args: Parameters<T>): boolean => {
    const key = keyGenerator(...args);
    return cache.delete(key);
  };

  return memoized;
}

/**
 * Schedule work to be done during idle time
 */
export function scheduleIdleWork<T>(
  work: () => T,
  options: { timeout?: number } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const { timeout = 5000 } = options;

    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(
        (deadline) => {
          try {
            const result = work();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        { timeout },
      );

      // Fallback timeout
      setTimeout(() => {
        window.cancelIdleCallback(id);
        try {
          const result = work();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, timeout);
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        try {
          const result = work();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 0);
    }
  });
}

/**
 * Measure execution time of a function
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  label?: string,
): T & {
  getStats(): { averageTime: number; callCount: number; totalTime: number };
} {
  let totalTime = 0;
  let callCount = 0;

  const measured = ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();

    try {
      const result = func(...args);

      // Handle both sync and async functions
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const end = performance.now();
          const duration = end - start;
          totalTime += duration;
          callCount++;

          if (label) {
            console.log(`${label}: ${duration.toFixed(2)}ms`);
          }
        });
      } else {
        const end = performance.now();
        const duration = end - start;
        totalTime += duration;
        callCount++;

        if (label) {
          console.log(`${label}: ${duration.toFixed(2)}ms`);
        }

        return result;
      }
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      totalTime += duration;
      callCount++;

      if (label) {
        console.log(`${label} (error): ${duration.toFixed(2)}ms`);
      }

      throw error;
    }
  }) as T & {
    getStats(): { averageTime: number; callCount: number; totalTime: number };
  };

  measured.getStats = () => ({
    averageTime: callCount > 0 ? totalTime / callCount : 0,
    callCount,
    totalTime,
  });

  return measured;
}
