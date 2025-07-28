export function addScript(
  src = 'https://connect.facebook.net/en_US/fbevents.js',
) {
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

export function setup() {
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
