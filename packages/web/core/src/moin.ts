import type { MoinTarget } from '@walkeros/core';
import { MOIN_PARAM, MOIN_PRODUCTION } from '@walkeros/core';
import { injectScript } from './injectScript';

// The base64url sha384 of the script's bytes: names the file and is its
// integrity value.
const FILE = /^[A-Za-z0-9_-]{64}$/;

// Shared by every copy on the page, so the first loader is the only one.
const GUARD = Symbol.for('walkeros.moin');

/**
 * The Tag Mode loader. Armed only by `?elbMoin` or the tab flag it leaves in
 * sessionStorage, and only in the top frame; it then waits for one message
 * from `target.app` naming a script by its hash, and loads that script from
 * `target.base` with the same hash as its integrity. Not armed, it adds no
 * listener, makes no request and writes nothing.
 */
export function moin(target: MoinTarget = MOIN_PRODUCTION): void {
  if (typeof window === 'undefined') return;
  runMoin(window, target);
}

/** `moin` against an explicit window. */
export function runMoin(win: Window, target: MoinTarget): void {
  // The loader runs first in every bundle: nothing here may stop it.
  try {
    if (
      typeof URLSearchParams === 'undefined' ||
      win.top !== win ||
      Reflect.get(win, GUARD)
    )
      return;

    let armed = new URLSearchParams(win.location.search).has(MOIN_PARAM);
    try {
      const storage = win.sessionStorage;
      armed = armed || storage.getItem(MOIN_PARAM) === '1';
      if (armed) storage.setItem(MOIN_PARAM, '1');
    } catch {
      // Storage denied: the parameter alone arms.
    }
    if (!armed) return;
    Reflect.set(win, GUARD, true);

    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== target.app) return;
      const data: unknown = event.data;
      if (typeof data !== 'object' || data === null) return;
      if (Reflect.get(data, 'elbMoin') !== 1) return;
      const file: unknown = Reflect.get(data, 'file');
      if (typeof file !== 'string' || !FILE.test(file)) return;
      win.removeEventListener('message', onMessage, true);
      void injectScript(
        `${target.base}${file}.js`,
        `sha384-${file.replace(/-/g, '+').replace(/_/g, '/')}`,
      );
    };
    // In the capture phase: a site that screens messages by origin and stops
    // the ones it does not know would otherwise keep the app's ping from the
    // loader. On the window, a capture listener runs before every listener of
    // the bubble phase.
    win.addEventListener('message', onMessage, true);
  } catch {
    // A broken page global leaves the loader off.
  }
}
