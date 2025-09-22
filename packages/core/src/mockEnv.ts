/**
 * Environment mocking utilities for walkerOS destinations
 *
 * Provides standardized tools for intercepting function calls in environment objects,
 * enabling consistent testing patterns across all destinations.
 */

type InterceptorFn = (
  path: string[],
  args: unknown[],
  original?: Function,
) => unknown;

/**
 * Creates a proxied environment that intercepts function calls
 *
 * Uses Proxy to wrap environment objects and capture all function calls,
 * allowing for call recording, mocking, or simulation.
 *
 * @param env - The environment object to wrap
 * @param interceptor - Function called for each intercepted call
 * @returns Proxied environment with interceptor applied
 *
 * @example
 * ```typescript
 * const calls: Array<{ path: string[]; args: unknown[] }> = [];
 *
 * const testEnv = mockEnv(env.push, (path, args) => {
 *   calls.push({ path, args });
 * });
 *
 * // Use testEnv with destination
 * await destination.push(event, { env: testEnv });
 *
 * // Analyze captured calls
 * expect(calls).toContainEqual({
 *   path: ['window', 'gtag'],
 *   args: ['event', 'purchase', { value: 99.99 }]
 * });
 * ```
 */
export function mockEnv<T extends object>(
  env: T,
  interceptor: InterceptorFn,
): T {
  const createProxy = (obj: object, path: string[] = []): object => {
    return new Proxy(obj, {
      get(target, prop: string) {
        const value = (target as Record<string, unknown>)[prop];
        const currentPath = [...path, prop];

        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            return interceptor(currentPath, args, value);
          };
        }

        if (value && typeof value === 'object') {
          return createProxy(value as object, currentPath);
        }

        return value;
      },
    });
  };

  return createProxy(env) as T;
}

/**
 * Traverses environment object and replaces values using a replacer function
 *
 * Alternative to mockEnv for environments where Proxy is not suitable.
 * Performs deep traversal and allows value transformation at each level.
 *
 * @param env - The environment object to traverse
 * @param replacer - Function to transform values during traversal
 * @returns New environment object with transformed values
 *
 * @example
 * ```typescript
 * const recordedCalls: APICall[] = [];
 *
 * const recordingEnv = traverseEnv(originalEnv, (value, path) => {
 *   if (typeof value === 'function') {
 *     return (...args: unknown[]) => {
 *       recordedCalls.push({
 *         path: path.join('.'),
 *         args: structuredClone(args)
 *       });
 *       return value(...args);
 *     };
 *   }
 *   return value;
 * });
 * ```
 */
export function traverseEnv<T extends object>(
  env: T,
  replacer: (value: unknown, path: string[]) => unknown,
): T {
  const traverse = (obj: unknown, path: string[] = []): unknown => {
    if (!obj || typeof obj !== 'object') return obj;

    const result: Record<string, unknown> | unknown[] = Array.isArray(obj)
      ? []
      : {};

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      if (Array.isArray(result)) {
        result[Number(key)] = replacer(value, currentPath);
      } else {
        (result as Record<string, unknown>)[key] = replacer(value, currentPath);
      }

      if (value && typeof value === 'object' && typeof value !== 'function') {
        if (Array.isArray(result)) {
          result[Number(key)] = traverse(value, currentPath);
        } else {
          (result as Record<string, unknown>)[key] = traverse(
            value,
            currentPath,
          );
        }
      }
    }

    return result;
  };

  return traverse(env) as T;
}
