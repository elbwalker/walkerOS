import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv } from '@walkeros/web-core';

export function addScript(
  env?: DestinationWeb.Env,
  src = 'https://connect.facebook.net/en_US/fbevents.js',
) {
  const { document } = getEnv(env);
  const script = (document as Document).createElement('script');
  script.src = src;
  script.async = true;
  (document as Document).head.appendChild(script);
}

interface FBQFunction {
  (...args: unknown[]): void;
  callMethod?: (this: FBQFunction, ...args: unknown[]) => void;
  queue: unknown[];
  push: FBQFunction;
  loaded: boolean;
  version: string;
}

export function setup(env?: DestinationWeb.Env) {
  const { window } = getEnv(env);
  const w = window as unknown as {
    fbq?: FBQFunction;
    _fbq?: FBQFunction;
  };
  if (w.fbq as unknown) return;

  const n = function (...args: unknown[]): void {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  } as FBQFunction;

  w.fbq = n;
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
}
