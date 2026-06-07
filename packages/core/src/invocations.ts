/**
 * Options for scheduling primitives ({@link debounce}, {@link throttle}).
 *
 * - `wait`: Debounce window in ms. Timer resets on every call.
 * - `size`: Hard call-count cap per window. Flush immediately when call
 *   count reaches this number. Useful for batch buffers that must not
 *   grow unbounded.
 * - `age`: Hard age cap in ms since the first call of the current window.
 *   Forces a flush even if calls keep arriving and reset the debounce.
 *   Prevents debounce starvation under sustained load.
 */
export interface ScheduleOptions {
  wait?: number;
  size?: number;
  age?: number;
}

/**
 * Returned by {@link debounce}: a callable that schedules `fn` plus
 * deterministic `flush` / `cancel` controls.
 */
export interface Debounced<P extends unknown[], R> {
  (...args: P): Promise<R | undefined>;
  /** Force an immediate flush with the most recent args. Resolves after `fn` settles. */
  flush(): Promise<R | undefined>;
  /** Cancel any pending invocation. No `fn` call, pending promises resolve to undefined. */
  cancel(): void;
  /** Number of scheduled calls since the current window opened. */
  size(): number;
}

function normalizeScheduleOptions(
  opts: number | ScheduleOptions | undefined,
  defaultWait: number,
): { wait: number; size?: number; age?: number } {
  if (typeof opts === 'number') return { wait: opts };
  if (!opts) return { wait: defaultWait };
  return {
    wait: opts.wait ?? defaultWait,
    size: opts.size,
    age: opts.age,
  };
}

/**
 * Creates a debounced function that delays invoking `fn` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `fn` invocations and a `flush` method to immediately invoke them.
 *
 * The second argument is either a `wait` number (legacy form) or a
 * {@link ScheduleOptions} object. The object form adds `size` (hard count
 * cap) and `age` (hard window-age cap) so the function flushes deterministically
 * under sustained load instead of letting the debounce reset forever.
 *
 * @template P, R
 * @param fn The function to debounce.
 * @param opts Either a wait-ms number or a {@link ScheduleOptions} object.
 * @param immediate Trigger the function on the leading edge, instead of the trailing.
 * @returns A {@link Debounced} callable with `flush`, `cancel`, and `size` methods.
 */
export function debounce<P extends unknown[], R>(
  fn: (...args: P) => R,
  opts: number | ScheduleOptions = 1000,
  immediate = false,
): Debounced<P, R> {
  const {
    wait,
    size: maxSize,
    age: maxAge,
  } = normalizeScheduleOptions(opts, 1000);

  let waitTimer: ReturnType<typeof setTimeout> | null = null;
  let ageTimer: ReturnType<typeof setTimeout> | null = null;
  let result: R | undefined;
  let hasCalledImmediately = false;
  let lastArgs: P | undefined;
  let pending: Array<(value: R | undefined) => void> = [];
  let count = 0;

  const reset = (): void => {
    if (waitTimer) {
      clearTimeout(waitTimer);
      waitTimer = null;
    }
    if (ageTimer) {
      clearTimeout(ageTimer);
      ageTimer = null;
    }
    count = 0;
    lastArgs = undefined;
  };

  const fire = (): R | undefined => {
    const args = lastArgs;
    const settle = pending;
    reset();
    pending = [];
    if (!args) {
      // Nothing scheduled. Resolve waiters with undefined.
      settle.forEach((r) => r(undefined));
      return undefined;
    }
    result = fn(...args);
    settle.forEach((r) => r(result));
    return result;
  };

  const debounced = ((...args: P): Promise<R | undefined> => {
    return new Promise<R | undefined>((resolve) => {
      const callNow = immediate && !hasCalledImmediately;

      lastArgs = args;
      count += 1;
      pending.push(resolve);

      // Reset debounce timer on every call.
      if (waitTimer) clearTimeout(waitTimer);
      waitTimer = setTimeout(() => {
        waitTimer = null;
        if (!immediate || hasCalledImmediately) {
          fire();
        }
      }, wait);

      // Arm the age timer once per window (on first call).
      if (maxAge !== undefined && !ageTimer) {
        ageTimer = setTimeout(() => {
          ageTimer = null;
          fire();
        }, maxAge);
      }

      // Size cap: flush synchronously when reached.
      if (maxSize !== undefined && count >= maxSize) {
        fire();
        return;
      }

      if (callNow) {
        hasCalledImmediately = true;
        result = fn(...args);
        // Drain pending promises (only this caller is pending at the
        // immediate edge, but be safe).
        const settle = pending;
        pending = [];
        settle.forEach((r) => r(result));
      }
    });
  }) as Debounced<P, R>;

  debounced.flush = (): Promise<R | undefined> => {
    if (!lastArgs && pending.length === 0) {
      // Nothing buffered, but an autonomous fire (wait/age/size cap) may have
      // already drained the window and left its `fn` return in `result`. For a
      // batch flush whose `fn` is async, that promise can still be in flight.
      // Return it so a caller like graceful shutdown awaits the in-flight work
      // instead of racing teardown (e.g. closing a writer mid-append). When
      // the last fire was sync/settled, awaiting a resolved value is a no-op.
      return Promise.resolve(result);
    }
    return new Promise<R | undefined>((resolve) => {
      pending.push(resolve);
      fire();
    });
  };

  debounced.cancel = (): void => {
    const settle = pending;
    pending = [];
    reset();
    // Drop the last fire's retained return so a later empty flush() cannot
    // surface a stale, cancelled-context result instead of undefined.
    result = undefined;
    settle.forEach((r) => r(undefined));
  };

  debounced.size = (): number => count;

  return debounced;
}

/**
 * Creates a throttled function that only invokes `fn` at most once per
 * every `delay` milliseconds.
 *
 * The second argument is either a delay-ms number (legacy form) or a
 * {@link ScheduleOptions} object. The object form is accepted for
 * symmetry with {@link debounce}; the `wait` field is used as the
 * inter-invocation interval. `size` and `age` are accepted but have no
 * semantic role in throttle (no buffer is held) — they exist so the
 * primitive can be swapped with `debounce` behind a single config shape.
 *
 * @template P, R
 * @param fn The function to throttle.
 * @param opts Either a delay-ms number or a {@link ScheduleOptions} object.
 * @returns The new throttled function.
 */

type Timeout = ReturnType<typeof setTimeout>;
export function throttle<P extends unknown[], R>(
  fn: (...args: P) => R | undefined,
  opts: number | ScheduleOptions = 1000,
): (...args: P) => R | undefined {
  const { wait } = normalizeScheduleOptions(opts, 1000);
  let isBlocked: Timeout | null = null;

  return function (...args: P): R | undefined {
    // Skip since function is still blocked by previous call
    if (isBlocked !== null) return;

    // Set a blocking timeout
    isBlocked = setTimeout(() => {
      // Unblock function
      isBlocked = null;
    }, wait) as Timeout;

    // Call the function
    return fn(...args);
  };
}
