import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { sourceSession } from '@walkeros/web-source-session';
import { dataLayerDestination } from './destination';

// Symbol.for gives the same key across two copies or versions on one page.
const LOADED = Symbol.for('@walkeros/walker.js');

function queue(...args: unknown[]): void {
  const layer: unknown = Reflect.get(window, 'elbLayer');
  const list: unknown[] = Array.isArray(layer) ? layer : [];
  if (list !== layer) Reflect.set(window, 'elbLayer', list);
  list.push(args);
}

function start(): void {
  void startFlow({
    sources: {
      session: { code: sourceSession },
      browser: {
        code: sourceBrowser,
        // Wait for the session source, so a session start precedes the first page view.
        config: { require: ['session'], settings: { history: true } },
        env: { window, document },
      },
    },
    destinations: { dataLayer: { code: dataLayerDestination() } },
  });
}

if (typeof window !== 'undefined' && !Reflect.get(window, LOADED)) {
  // Set before anything async so a second copy stops here.
  Reflect.set(window, LOADED, true);

  // Calls made before DOM ready are queued; the browser source adopts
  // elbLayer and replaces this unmarked stub with its own writer.
  if (typeof Reflect.get(window, 'elb') !== 'function')
    Reflect.set(window, 'elb', queue);

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
