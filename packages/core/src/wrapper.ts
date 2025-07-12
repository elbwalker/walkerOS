import type { Wrapper } from './types';

/**
 * Creates a wrapper function that can be used to wrap other functions.
 *
 * @param type The type of the wrapper.
 * @param config The configuration for the wrapper.
 * @returns A wrapper function.
 */
export function createWrapper(
  type: string = 'unknown',
  { dryRun = false, mockReturn, onCall }: Wrapper.Config = {},
): Wrapper.Wrap {
  return function wrap<T>(name: string, originalFn: T): T {
    if (typeof originalFn !== 'function') return originalFn;

    return ((...args: unknown[]) => {
      const context: Wrapper.Fn = { name, type };

      // Call the callback if provided
      if (onCall) onCall(context, args);

      // Handle dry run
      if (dryRun) return mockReturn;

      // Execute original function
      return originalFn(...args);
    }) as T;
  };
}
