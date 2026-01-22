import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv } from '@walkeros/web-core';

const loadedScripts = new Set<string>();

// For testing: allow resetting loaded scripts
export function resetLoadedScripts(): void {
  loadedScripts.clear();
}

export function addScript(
  collectorUrl: string,
  env?: DestinationWeb.Env,
  src = 'https://cdn.jsdelivr.net/npm/@snowplow/javascript-tracker@latest/dist/sp.js',
): void {
  // Prevent loading the same script multiple times
  if (loadedScripts.has(collectorUrl)) return;

  const { document } = getEnv(env);
  const script = (document as Document).createElement('script');
  script.src = src;
  script.async = true;
  (document as Document).head.appendChild(script);
  loadedScripts.add(collectorUrl);
}

// Snowplow function interface
interface SnowplowFunction {
  (...args: unknown[]): void;
  q?: unknown[];
}

export function setup(env?: DestinationWeb.Env): SnowplowFunction | undefined {
  const { window } = getEnv(env);
  const w = window as unknown as {
    snowplow?: SnowplowFunction;
    GlobalSnowplowNamespace?: string[];
  };

  // Setup snowplow function if not exists
  if (!w.snowplow) {
    const sp = function (...args: unknown[]): void {
      (sp.q = sp.q || []).push(args);
    } as SnowplowFunction;

    sp.q = [];
    w.snowplow = sp;
    w.GlobalSnowplowNamespace = ['snowplow'];
  }

  return w.snowplow;
}
