import type { Wrapper } from './types';

export function createWrapper(
  id: string,
  type: string,
  { dryRun = false, mockReturn, onCall }: Wrapper.Config = {},
): Wrapper.Wrap {
  return function wrap<T>(name: string, originalFn: T): T {
    // If not a function, return as-is
    if (typeof originalFn !== 'function') {
      return originalFn;
    }

    return ((...args: unknown[]) => {
      const context: Wrapper.Fn = {
        name,
        id,
        type,
      };

      // Call the callback if provided
      if (onCall) {
        onCall(context, args);
      }

      // Handle dry run
      if (dryRun) {
        return mockReturn;
      }

      // Execute original function
      return (originalFn as (...args: unknown[]) => unknown)(...args);
    }) as T;
  };
}
