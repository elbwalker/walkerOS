// Use function overload to support different return type depending on onError
// Types
export function tryCatch<P extends unknown[], R, S>(
  fn: (...args: P) => R | undefined,
  onError: (err: unknown) => S,
  onFinally?: () => void,
): (...args: P) => R | S;
export function tryCatch<P extends unknown[], R>(
  fn: (...args: P) => R | undefined,
  onError?: undefined,
  onFinally?: () => void,
): (...args: P) => R | undefined;
// Implementation
export function tryCatch<P extends unknown[], R, S>(
  fn: (...args: P) => R | undefined,
  onError?: (err: unknown) => S,
  onFinally?: () => void,
): (...args: P) => R | S | undefined {
  return function (...args: P): R | S | undefined {
    try {
      return fn(...args);
    } catch (err) {
      if (!onError) return;
      return onError(err);
    } finally {
      onFinally?.();
    }
  };
}

// Use function overload to support different return type depending on onError
// Types
export function tryCatchAsync<P extends unknown[], R, S>(
  fn: (...args: P) => R,
  onError: (err: unknown) => S,
  onFinally?: () => void | Promise<void>,
): (...args: P) => Promise<R | S>;
export function tryCatchAsync<P extends unknown[], R>(
  fn: (...args: P) => R,
  onError?: undefined,
  onFinally?: () => void | Promise<void>,
): (...args: P) => Promise<R | undefined>;
// Implementation
export function tryCatchAsync<P extends unknown[], R, S>(
  fn: (...args: P) => R,
  onError?: (err: unknown) => S,
  onFinally?: () => void | Promise<void>,
): (...args: P) => Promise<R | S | undefined> {
  return async function (...args: P): Promise<R | S | undefined> {
    try {
      return await fn(...args);
    } catch (err) {
      if (!onError) return;
      return await onError(err);
    } finally {
      await onFinally?.();
    }
  };
}
