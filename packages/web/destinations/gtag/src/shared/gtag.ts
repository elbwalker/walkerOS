// Gtag script loading and initialization utilities

import type { WindowWithDataLayer } from '../types';
import { StepError } from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';

export const gtagScriptSrc = 'https://www.googletagmanager.com/gtag/js?id=';

/** gtag replays its dataLayer stub, so loadVendor only watches the script. */
const gtagGlobal = () => getEnv().window.gtag;

/**
 * Loads gtag.js through `loadVendor` (once per src and page).
 *
 * `src` loads first-party from a tagging server and is used verbatim: the
 * serving path maps to the id inside the container, so the id is not appended.
 * If it fails to load, the script falls back to googletagmanager.com so a
 * misconfigured container degrades to working measurement instead of none.
 */
export function loadGtag(id: string, src?: string, timeout?: number): void {
  const primary = loadVendor(src ?? gtagScriptSrc + id, gtagGlobal, {
    timeout,
  });
  if (src)
    primary.ready().catch((error: unknown) => {
      if (error instanceof StepError && error.code === 'vendor-not-loaded')
        loadVendor(gtagScriptSrc + id, gtagGlobal, { timeout });
    });
}

/**
 * Throws `vendor-not-loaded` once gtag.js for `id` failed to load, its
 * googletagmanager.com fallback too where a first-party `src` was set.
 */
export function checkGtag(id: string, src?: string, timeout?: number): void {
  try {
    loadVendor(src ?? gtagScriptSrc + id, gtagGlobal, { timeout }).check();
  } catch (error) {
    if (!src) throw error;
    loadVendor(gtagScriptSrc + id, gtagGlobal, { timeout }).check();
  }
}

/**
 * Waits for what the gtag or dataLayer calls of one step returned (the stub
 * returns nothing); a throw or a rejection becomes a StepError of `code`.
 */
export async function settle(
  calls: () => unknown[],
  code: string,
  message: string,
): Promise<void> {
  try {
    await Promise.all(calls());
  } catch (error) {
    if (error instanceof StepError) throw error;
    throw new StepError(message, { code, cause: error });
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
