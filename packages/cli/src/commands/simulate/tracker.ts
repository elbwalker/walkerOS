/**
 * Call Tracker for Simulation
 *
 * Wraps mock environment functions to track API calls.
 * Used with destination-provided examples/env.ts mocks.
 */

export interface ApiCall {
  type: 'call';
  path: string;
  args: unknown[];
  timestamp: number;
}

export class CallTracker {
  private calls: Map<string, ApiCall[]> = new Map();

  /**
   * Wrap a function to track its calls
   */
  wrapFunction(
    name: string,
    fn?: (...args: unknown[]) => unknown,
  ): (...args: unknown[]) => unknown {
    const self = this;
    const targetFn = fn || (() => {});

    return new Proxy(targetFn, {
      apply(_target, thisArg, args: unknown[]) {
        self.logCall(name, args);
        return targetFn.apply(thisArg, args);
      },
    });
  }

  /**
   * Wrap an environment object, tracking specified paths
   *
   * @param env - Environment object (from destination's examples/env.ts)
   * @param paths - Paths to track (e.g., ['gtag:window.gtag', 'gtag:window.dataLayer.push'])
   */
  wrapEnv<T extends Record<string, unknown>>(env: T, paths: string[]): T {
    const wrapped: Record<string, unknown> = {};

    // Deep clone the env object first
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'object' && value !== null) {
        wrapped[key] = Array.isArray(value)
          ? [...value]
          : { ...(value as Record<string, unknown>) };
      } else {
        wrapped[key] = value;
      }
    }

    // Wrap specified paths
    for (const fullPath of paths) {
      // Parse path: "gtag:window.gtag" → destKey="gtag", path="window.gtag"
      const [destKey, ...pathParts] = fullPath.split(':');
      const path = pathParts.join(':');

      if (!path) continue;

      // Remove "call:" prefix if present (from simulation array)
      const cleanPath = path.replace(/^call:/, '');
      const parts = cleanPath.split('.');

      let current: Record<string, unknown> = wrapped;
      let source: Record<string, unknown> | undefined = env;

      // Navigate to parent object
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];

        if (!current[part]) {
          current[part] = {};
        }

        current = current[part] as Record<string, unknown>;
        source =
          source && typeof source[part] === 'object' && source[part] !== null
            ? (source[part] as Record<string, unknown>)
            : undefined;
      }

      // Wrap the final property
      const finalKey = parts[parts.length - 1];
      const originalFn = source?.[finalKey];

      // Wrap with full path for tracking
      current[finalKey] = this.wrapFunction(
        `${destKey}:${cleanPath}`,
        typeof originalFn === 'function'
          ? (originalFn as (...args: unknown[]) => unknown)
          : undefined,
      );
    }

    return wrapped as T;
  }

  private logCall(fullPath: string, args: unknown[]): void {
    // Parse "destKey:api.path" → destKey and apiPath
    const [destKey, ...pathParts] = fullPath.split(':');
    const apiPath = pathParts.join(':');

    if (!this.calls.has(destKey)) {
      this.calls.set(destKey, []);
    }

    this.calls.get(destKey)!.push({
      type: 'call',
      path: apiPath,
      args,
      timestamp: Date.now(),
    });
  }

  getCalls(): Record<string, ApiCall[]> {
    return Object.fromEntries(this.calls);
  }

  reset(): void {
    this.calls.clear();
  }
}
