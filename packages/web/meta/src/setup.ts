export function addScript(
  src = 'https://connect.facebook.net/en_US/fbevents.js',
) {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

export function setup() {
  const w = window;
  if (w.fbq as unknown) return;

  const n = (w.fbq = function (): void {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = !0;
  n.version = '2.0';
  n.queue = [];
}
