// Gtag script loading and initialization utilities

import type { Env, WindowWithDataLayer } from '../types';
import { StepError } from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';

export const gtagScriptSrc = 'https://www.googletagmanager.com/gtag/js?id=';

/**
 * gtag replays its dataLayer stub, so loadVendor only watches the script, in
 * the env's document.
 */
function gtagVendor(src: string, timeout?: number, env?: Env) {
  const { window, document } = getEnv<Env>(env);
  return loadVendor(src, () => window.gtag, { timeout, document });
}

/**
 * Loads gtag.js through `loadVendor` (once per src and page).
 *
 * `src` loads first-party from a tagging server and is used verbatim: the
 * serving path maps to the id inside the container, so the id is not appended.
 * If it fails to load, the script falls back to googletagmanager.com so a
 * misconfigured container degrades to working measurement instead of none.
 */
export function loadGtag(
  id: string,
  src?: string,
  timeout?: number,
  env?: Env,
): void {
  const primary = gtagVendor(src ?? gtagScriptSrc + id, timeout, env);
  if (src)
    primary.ready().catch((error: unknown) => {
      if (error instanceof StepError && error.code === 'vendor-not-loaded')
        gtagVendor(gtagScriptSrc + id, timeout, env);
    });
}

/**
 * Throws `vendor-not-loaded` once gtag.js for `id` failed to load, its
 * googletagmanager.com fallback too where a first-party `src` was set.
 */
export function checkGtag(
  id: string,
  src?: string,
  timeout?: number,
  env?: Env,
): void {
  try {
    gtagVendor(src ?? gtagScriptSrc + id, timeout, env).check();
  } catch (error) {
    if (!src) throw error;
    gtagVendor(gtagScriptSrc + id, timeout, env).check();
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
