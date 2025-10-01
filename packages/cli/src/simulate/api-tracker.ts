export interface ApiCall {
  type: 'get' | 'set' | 'call';
  path: string;
  args?: unknown[];
  value?: unknown;
  timestamp: number;
}

/**
 * Creates a Proxy-based API tracker that intercepts property access,
 * assignments, and function calls on nested object paths.
 */
export function createApiTracker<T extends Record<string, unknown>>(
  entry: T,
  logger: (call: ApiCall) => void,
  paths?: string[],
): T {
  const log = (type: ApiCall['type'], path: string, ...rest: unknown[]) => {
    // Skip logging get operations
    if (type === 'get') return;

    // If paths filter provided, check if this operation should be logged
    if (paths && paths.length > 0) {
      const matches = paths.some((pattern) => {
        if (pattern.includes(':')) {
          const [opType, opPath] = pattern.split(':');
          if (opPath === '*') {
            return type === opType;
          }
          return type === opType && path.startsWith(opPath);
        }
        return path.startsWith(pattern);
      });
      if (!matches) return; // Don't log if no match
    }

    const call: ApiCall = { type, path, timestamp: Date.now() };

    if (type === 'call' && rest.length > 0) {
      call.args = rest[0] as unknown[];
    } else if (type === 'set' && rest.length > 0) {
      call.value = rest[0];
    }

    logger(call);
  };

  const createNestedProxy = (
    currentPath: string,
    baseTarget: Record<string, unknown> = {},
  ): unknown => {
    return new Proxy(baseTarget, {
      get(target: Record<string, unknown>, prop: string | symbol) {
        if (typeof prop === 'symbol') return undefined;

        const fullPath = currentPath ? `${currentPath}.${prop}` : prop;

        // Log property access
        log('get', fullPath);

        // Return existing value if it exists
        if (target[prop] !== undefined) {
          const value = target[prop];

          // If it's an array, wrap it with proxy to track method calls
          if (Array.isArray(value)) {
            return new Proxy(value, {
              get(arrayTarget, arrayProp: string | symbol) {
                if (typeof arrayProp === 'symbol')
                  return arrayTarget[arrayProp as keyof typeof arrayTarget];

                const nestedPath = `${fullPath}.${arrayProp}`;

                if (arrayProp === 'push') {
                  log('get', nestedPath);

                  return new Proxy(arrayTarget.push.bind(arrayTarget), {
                    apply(_target, thisArg, args: unknown[]) {
                      log('call', nestedPath, args);
                      return arrayTarget.push.apply(thisArg, args);
                    },
                  });
                }

                return arrayTarget[arrayProp as keyof typeof arrayTarget];
              },
            });
          }

          // If it's an object (but not array or null), wrap it recursively
          if (typeof value === 'object' && value !== null) {
            return createNestedProxy(
              fullPath,
              value as Record<string, unknown>,
            );
          }

          // If it's a function, wrap it to track calls
          if (typeof value === 'function') {
            return new Proxy(value, {
              apply(target, thisArg, args: unknown[]) {
                log('call', fullPath, args);
                return target.apply(thisArg, args);
              },
            });
          }

          return value;
        }

        // Return a function proxy that can also be treated as an object
        const functionProxy = new Proxy(() => {}, {
          apply(_target, _thisArg, args: unknown[]) {
            // Log function call
            log('call', fullPath, args);
            return undefined;
          },

          get(_target, nestedProp: string | symbol) {
            if (typeof nestedProp === 'symbol') return undefined;

            const nestedPath = `${fullPath}.${nestedProp}`;

            // Log nested property access
            log('get', nestedPath);

            // Special handling for array methods like push
            if (nestedProp === 'push') {
              return new Proxy(() => {}, {
                apply(_target, _thisArg, args: unknown[]) {
                  log('call', nestedPath, args);
                  return undefined;
                },
              });
            }

            // Return another nested proxy for deeper access
            return createNestedProxy(nestedPath);
          },
        });

        return functionProxy;
      },

      set(
        target: Record<string, unknown>,
        prop: string | symbol,
        value: unknown,
      ) {
        if (typeof prop === 'symbol') return false;

        const fullPath = currentPath ? `${currentPath}.${prop}` : prop;

        // Log property assignment
        log('set', fullPath, value);

        target[prop] = value;
        return true;
      },
    });
  };

  return createNestedProxy('', entry as Record<string, unknown>) as T;
}

/**
 * Logs API usage calls to the vmUsage record
 */
export function logApiUsage(
  vmUsage: Record<string, ApiCall[]>,
  name: string,
  call: ApiCall,
): void {
  if (!vmUsage[name]) vmUsage[name] = [];
  vmUsage[name].push(call);
}
