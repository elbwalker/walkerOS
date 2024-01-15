export function debounce<P extends unknown[], R>(
  fn: (...args: P) => R,
  wait = 1000,
) {
  let timer: number | NodeJS.Timeout;

  return (...args: P): Promise<R> => {
    // abort previous invocation
    clearTimeout(timer);

    // Return value as promise
    return new Promise((resolve) => {
      // Schedule execution
      timer = setTimeout(() => {
        // Call the function
        resolve(fn(...args));
      }, wait);
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
