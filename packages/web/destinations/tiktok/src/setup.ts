import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv } from '@walkeros/web-core';

const DEFAULT_TIKTOK_SRC = 'https://analytics.tiktok.com/i18n/pixel/events.js';

/**
 * Inject the TikTok Pixel CDN script. The real SDK replaces the queueing
 * stub created by setup() with a full implementation.
 */
export function addScript(
  env?: DestinationWeb.Env,
  src = DEFAULT_TIKTOK_SRC,
): void {
  const { document } = getEnv(env);
  const script = (document as Document).createElement('script');
  script.src = src;
  script.async = true;
  (document as Document).head.appendChild(script);
}

interface TTQFunction {
  (...args: unknown[]): void;
  methods?: string[];
  _i?: Record<string, unknown>;
  loaded?: boolean;
  page?: (...args: unknown[]) => void;
  track?: (...args: unknown[]) => void;
  identify?: (...args: unknown[]) => void;
  enableCookie?: (...args: unknown[]) => void;
  disableCookie?: (...args: unknown[]) => void;
  load?: (...args: unknown[]) => void;
}

/**
 * Create the `window.ttq` queue object (TikTok's snippet pattern).
 * Any method call before the real SDK loads is buffered; once the CDN
 * script runs, the queue is replayed in order. Idempotent — does
 * nothing if ttq already exists on the window.
 */
export function setup(env?: DestinationWeb.Env): void {
  const { window } = getEnv(env);
  const w = window as unknown as { ttq?: TTQFunction };
  if (w.ttq && (w.ttq as TTQFunction).loaded) return;

  // Preserve any existing mock ttq (from env.window.ttq in tests). Only
  // construct a new queue if nothing is there.
  if (!w.ttq) {
    const n = function (...args: unknown[]): void {
      (n._i as Record<string, unknown[]>) ||= {};
      ((n._i as { all?: unknown[] }).all ||= []).push(args);
    } as TTQFunction;

    n.methods = [
      'page',
      'track',
      'identify',
      'instances',
      'debug',
      'on',
      'off',
      'once',
      'ready',
      'alias',
      'group',
      'enableCookie',
      'disableCookie',
    ];

    // Stub out each method to enqueue through the root `n` function.
    for (const method of n.methods) {
      (n as unknown as Record<string, unknown>)[method] = (
        ...args: unknown[]
      ) => n(method, ...args);
    }

    n._i = {};
    n.loaded = false;
    w.ttq = n;
  }
}
