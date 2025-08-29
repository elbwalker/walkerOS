import type { DestinationWeb } from '@walkeros/web-core';
import { getEnvironment } from '@walkeros/web-core';

export function addScript(
  env?: DestinationWeb.Environment,
  src = 'https://connect.facebook.net/en_US/fbevents.js',
) {
  const { document } = getEnvironment(env);
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

interface FBQFunction {
  (...args: unknown[]): void;
  callMethod?: (this: FBQFunction, ...args: unknown[]) => void;
  queue: unknown[];
  push: FBQFunction;
  loaded: boolean;
  version: string;
}

export function setup(env?: DestinationWeb.Environment) {
  const { window } = getEnvironment(env);
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
