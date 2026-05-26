import type { Hooks, Logger } from './types';

/**
 * A utility function that wraps a function with hooks.
 *
 * Pre/post hooks are user-supplied and may throw. A throwing hook must not
 * crash the surrounding pipeline. On failure, fall back to calling the
 * original function (pre-hook) or keep the original result (post-hook).
 *
 * The generic `F` preserves the exact call shape of `fn`, including named
 * parameters and overloaded interfaces, so call sites can assign the result
 * to the same interface slot without a cast.
 *
 * @template F The exact function type being wrapped.
 * @param fn The function to wrap.
 * @param name The name of the function.
 * @param hooks The hooks to use.
 * @param logger Optional logger for hook failure warnings. Falls back to
 *   `console.warn` when not provided.
 * @returns The wrapped function with the same call shape as `fn`.
 */
export function useHooks<F extends Hooks.AnyFunction>(
  fn: F,
  name: string,
  hooks: Hooks.Functions,
  logger?: Logger.Instance,
): F {
  // Re-anchor `fn` to its structural call shape. The generic constraint
  // `Hooks.AnyFunction` widens calls to `unknown`, so a locally-typed alias
  // restores precise argument and return types inside the closure. Same
  // bridging concern as the two hook-lookup casts below.
  const inner = fn as (...args: Parameters<F>) => ReturnType<F>;
  const wrapped = function (this: unknown, ...args: Parameters<F>) {
    let result: ReturnType<F>;
    const preHook = ('pre' + name) as keyof Hooks.Functions;
    const postHook = ('post' + name) as keyof Hooks.Functions;
    const preHookFn = hooks[preHook] as unknown as Hooks.HookFn<typeof inner>;
    const postHookFn = hooks[postHook] as unknown as Hooks.HookFn<typeof inner>;

    const warn = (message: string, error: unknown) => {
      if (logger) {
        logger.warn(message, { error });
      } else {
        console.warn(message, error);
      }
    };

    if (preHookFn) {
      try {
        result = preHookFn({ fn: inner }, ...args);
      } catch (error) {
        warn(
          `Hook ${String(preHook)} failed, falling back to original function`,
          error,
        );
        result = inner(...args);
      }
    } else {
      result = inner(...args);
    }

    if (postHookFn) {
      try {
        result = postHookFn({ fn: inner, result }, ...args);
      } catch (error) {
        warn(`Hook ${String(postHook)} failed, keeping original result`, error);
      }
    }

    return result;
  };
  return wrapped as F;
}
