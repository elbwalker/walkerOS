import type { Env } from './types';
import { getEnv } from '@walkeros/web-core';

export function addScript(
  env?: Env,
  src = 'https://connect.facebook.net/en_US/fbevents.js',
) {
  const { document } = getEnv<Env>(env);
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

/**
 * The fbevents.js bootstrap stub: a callable that queues calls until the real
 * library loads and installs `callMethod`. The intersection captures both the
 * public `fbq` call signature and the internal queue properties the snippet
 * mutates.
 */
type FbqStub = facebook.Pixel.Event & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push?: facebook.Pixel.Event;
  loaded?: boolean;
  version?: string;
};

export function setup(env?: Env) {
  const { window } = getEnv<Env>(env);
  if (window.fbq) return;

  const fbq: FbqStub = Object.assign(
    function (...args: unknown[]): void {
      fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
    },
    { queue: [] },
  );
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';

  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
}
