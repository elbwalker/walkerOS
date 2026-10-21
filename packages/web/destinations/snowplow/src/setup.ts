import type { Env, SnowplowFunction } from './types';
import { getEnv } from '@walkeros/web-core';

/**
 * Default Snowplow tracker script URL
 *
 * WARNING: Using @latest in production is not recommended.
 * Always pin to a specific version for production deployments.
 */
export const DEFAULT_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/@snowplow/javascript-tracker@latest/dist/sp.js';

export function setup(env?: Env): SnowplowFunction | undefined {
  const { window } = getEnv<Env>(env);

  // Setup snowplow function if not exists
  if (!window.snowplow) {
    const sp: SnowplowFunction = function (...args: unknown[]): void {
      (sp.q = sp.q || []).push(args);
    };

    sp.q = [];
    window.snowplow = sp;
    window.GlobalSnowplowNamespace = ['snowplow'];
  }

  return window.snowplow;
}
