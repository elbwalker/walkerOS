// Gtag script loading and initialization utilities

const loadedScripts = new Set<string>();

// For testing: allow resetting loaded scripts
export function resetLoadedScripts(): void {
  loadedScripts.clear();
}

export function addScript(
  id: string,
  src = 'https://www.googletagmanager.com/gtag/js?id=',
): void {
  // Prevent loading the same script multiple times
  if (loadedScripts.has(id)) return;

  const script = document.createElement('script');
  script.src = src + id;
  document.head.appendChild(script);
  loadedScripts.add(id);
}

export function initializeGtag(): void {
  const w = window;

  // Setup dataLayer if not exists
  w.dataLayer = w.dataLayer || [];

  // Setup gtag function if not exists
  if (!w.gtag) {
    w.gtag = function () {
      (w.dataLayer as unknown[]).push(arguments);
    };
  }
}

export function getGtag(
  wrap: (name: string, fn: Function) => Function,
): Gtag.Gtag {
  return wrap('gtag', window.gtag) as Gtag.Gtag;
}
