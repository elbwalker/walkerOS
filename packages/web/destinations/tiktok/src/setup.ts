import type { DestinationWeb } from '@walkeros/web-core';
import type { TTQStub } from './types';
import { getEnv } from '@walkeros/web-core';

/** The TikTok Pixel library, loaded through `loadVendor`. */
export const SCRIPT_SRC = 'https://analytics.tiktok.com/i18n/pixel/events.js';

const METHODS = [
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

/**
 * Create the `window.ttq` queue object (TikTok's snippet pattern).
 * Any method call before the real SDK loads is buffered; once the CDN
 * script runs, the queue is replayed in order. Idempotent: does nothing if
 * ttq already exists on the window (a loaded Pixel, or a mock in tests).
 */
export function setup(env?: DestinationWeb.Env): void {
  const { window } = getEnv(env);
  if (window.ttq) return;

  const record = (...args: unknown[]): void => {
    (stub._i.all ||= []).push(args);
  };
  const stub: TTQStub = Object.assign(record, {
    methods: [...METHODS],
    _i: {},
    loaded: false,
  });

  // Stub out each method to enqueue through the root function.
  window.ttq = Object.assign(
    stub,
    Object.fromEntries(
      METHODS.map((method) => [
        method,
        (...args: unknown[]) => stub(method, ...args),
      ]),
    ),
  );
}
