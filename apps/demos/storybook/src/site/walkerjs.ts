import type { SourceBrowser } from '@walkeros/web-source-browser';

/**
 * The managed walker.js of the app flow "Tagging demo", the one the static
 * tagging demo runs. Its bundle carries the `elbPreview` loader, so the app's
 * Preview and Observe can swap in a session bundle.
 */
export const WALKER_JS_URL =
  'https://stage.cdn.walkeros.io/d/pl4y9p4n0dea/walker.js';

// Narrowed by `typeof`: on this page only the queue below or walker.js's
// push sits there. The global's own type (`Elb.Fn`) lacks the browser-only
// commands ViewSource sends, such as `walker init`.
const isPush = (value: unknown): value is SourceBrowser.Push =>
  typeof value === 'function';

/**
 * The static demo's elb stub: calls made before walker.js runs wait in
 * `window.elbLayer`, which the browser source replays when it starts and then
 * replaces `window.elb` with its own push. A queued call resolves `ok`, it is
 * queued, not delivered. Only installed when no walkerOS set `window.elb` yet.
 */
export function installElbQueue(win: Window): void {
  const existing: unknown = win.elb;
  if (isPush(existing)) return;
  const queue: SourceBrowser.Push = (
    ...args: Parameters<SourceBrowser.BrowserArguments>
  ) => {
    (win.elbLayer = win.elbLayer || []).push(args);
    return Promise.resolve({ ok: true });
  };
  win.elb = queue;
}

/** The page's elb right now: the queue until walker.js runs, then its push. */
export function currentElb(win: Window): SourceBrowser.Push | undefined {
  const elb: unknown = win.elb;
  return isPush(elb) ? elb : undefined;
}

/**
 * Appends walker.js once, async. Call it after the page's first render: the
 * run reads `data-elbuser`, the load triggers and the tagged elements from
 * the DOM. `onError` runs when the script does not load (offline, blocked,
 * CDN down), so the page can say that it sends no events.
 */
export function loadWalkerJs(doc: Document, onError: () => void): void {
  const existing = doc.querySelector(`script[src="${WALKER_JS_URL}"]`);
  if (existing) {
    existing.addEventListener('error', onError);
    return;
  }
  const script = doc.createElement('script');
  script.async = true;
  script.src = WALKER_JS_URL;
  script.addEventListener('error', onError);
  doc.head.appendChild(script);
}
