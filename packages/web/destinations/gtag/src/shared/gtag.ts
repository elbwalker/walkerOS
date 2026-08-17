// Gtag script loading and initialization utilities

import type { WindowWithDataLayer } from '../types';

const loadedScripts = new Set<string>();

// For testing: allow resetting loaded scripts
export function resetLoadedScripts(): void {
  loadedScripts.clear();
}

export const gtagScriptSrc = 'https://www.googletagmanager.com/gtag/js?id=';

/**
 * Injects the gtag.js script.
 *
 * `src` loads first-party from a tagging server and is used verbatim: the
 * serving path maps to the id inside the container, so the id is not appended.
 * If it fails to load, the script falls back to googletagmanager.com so a
 * misconfigured container degrades to working measurement instead of none.
 */
export function addScript(
  id: string,
  src?: string,
  document: Document = globalThis.document,
): void {
  // Prevent loading the same script multiple times
  if (loadedScripts.has(id)) return;
  loadedScripts.add(id);

  const inject = (url: string, onError?: () => void) => {
    const script = document.createElement('script');
    script.src = url;
    if (onError) script.onerror = onError;
    document.head.appendChild(script);
  };

  if (src) {
    inject(src, () => inject(gtagScriptSrc + id));
  } else {
    inject(gtagScriptSrc + id);
  }
}

export function initializeGtag(
  window: WindowWithDataLayer,
): Gtag.Gtag | undefined {
  const w = window;

  // Setup dataLayer if not exists
  w.dataLayer = w.dataLayer || [];

  // Setup gtag function if not exists
  if (!w.gtag) {
    w.gtag = function () {
      w.dataLayer.push(arguments);
    };
  }

  return w.gtag;
}
