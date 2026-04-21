import type { Hooks, Logger } from './types';

/**
 * A utility function that wraps a function with hooks.
 *
 * Pre/post hooks are user-supplied and may throw. A throwing hook must not
 * crash the surrounding pipeline — on failure, fall back to calling the
 * original function (pre-hook) or keep the original result (post-hook).
 *
 * @template P, R
 * @param fn The function to wrap.
 * @param name The name of the function.
 * @param hooks The hooks to use.
 * @param logger Optional logger for hook failure warnings. Falls back to
 *   `console.warn` when not provided.
 * @returns The wrapped function.
 */
export function useHooks<P extends unknown[], R>(
  fn: (...args: P) => R,
  name: string,
  hooks: Hooks.Functions,
  logger?: Logger.Instance,
): (...args: P) => R {
  return function (...args: P): R {
    let result: R;
    const preHook = ('pre' + name) as keyof Hooks.Functions;
    const postHook = ('post' + name) as keyof Hooks.Functions;
    const preHookFn = hooks[preHook] as unknown as Hooks.HookFn<typeof fn>;
    const postHookFn = hooks[postHook] as unknown as Hooks.HookFn<typeof fn>;

    const warn = (message: string, error: unknown) => {
      if (logger) {
        logger.warn(message, { error });
      } else {
        console.warn(message, error);
      }
    };

    if (preHookFn) {
      try {
        result = preHookFn({ fn }, ...args);
      } catch (error) {
        warn(
          `Hook ${String(preHook)} failed, falling back to original function`,
          error,
        );
        result = fn(...args);
      }
    } else {
      result = fn(...args);
    }

    if (postHookFn) {
      try {
        result = postHookFn({ fn, result }, ...args);
      } catch (error) {
        warn(`Hook ${String(postHook)} failed, keeping original result`, error);
      }
    }

    return result;
  };
}
