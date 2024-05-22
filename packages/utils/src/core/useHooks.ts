import { Hooks } from '@elbwalker/types';

export function useHooks<P extends unknown[], R>(
  fn: (...args: P) => R,
  name: string,
  hooks: Hooks.Functions,
): (...args: P) => R {
  return function (...args: P): R {
    let result: R;
    const preHook = ('pre' + name) as keyof Hooks.Functions;
    const postHook = ('post' + name) as keyof Hooks.Functions;
    const preHookFn = hooks[preHook] as unknown as Hooks.HookFn<typeof fn>;
    const postHookFn = hooks[postHook] as unknown as Hooks.HookFn<typeof fn>;

    if (preHookFn) {
      // Call the original function within the preHook
      result = preHookFn({ fn }, ...args);
    } else {
      // Regular function call
      result = fn(...args);
    }

    if (postHookFn) {
      // Call the post-hook function with fn, result, and the original args
      result = postHookFn({ fn, result }, ...args);
    }

    return result;
  };
}
