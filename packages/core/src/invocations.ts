export function debounce<P extends unknown[], R>(
  fn: (...args: P) => R,
  wait = 1000,
  immediate = false,
) {
  let timer: number | NodeJS.Timeout | null = null;
  let result: R;
  let hasCalledImmediately = false;

  return (...args: P): Promise<R> => {
    // Return value as promise
    return new Promise((resolve) => {
      const callNow = immediate && !hasCalledImmediately;

      // abort previous invocation
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        timer = null;
        if (!immediate || hasCalledImmediately) {
          result = fn(...args);
          resolve(result);
        }
      }, wait);

      if (callNow) {
        hasCalledImmediately = true;
        result = fn(...args);
        resolve(result);
      }
    });
  };
}

type Timeout = ReturnType<typeof setTimeout>;
export function throttle<P extends unknown[], R>(
  fn: (...args: P) => R | undefined,
  delay = 1000,
): (...args: P) => R | undefined {
  let isBlocked: Timeout | null = null;

  return function (...args: P): R | undefined {
    // Skip since function is still blocked by previous call
    if (isBlocked !== null) return;

    // Set a blocking timeout
    isBlocked = setTimeout(() => {
      // Unblock function
      isBlocked = null;
    }, delay) as Timeout;

    // Call the function
    return fn(...args);
  };
}
