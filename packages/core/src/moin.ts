import { injectScript } from './inject-script';

/** Where a Tag Mode script comes from and whose message may request it. */
export interface MoinTarget {
  /** The app origin whose message is trusted, compared with `===`. */
  app: string;
  /** The script base URL, ending in `/`. */
  base: string;
}

/** The link parameter that arms the loader; its value is ignored. */
export const MOIN_PARAM = 'elbMoin';

export const MOIN_PRODUCTION: MoinTarget = {
  app: 'https://app.walkeros.io',
  base: 'https://cdn.walkeros.io/tag-mode/',
};

// The base64url sha384 of the script's bytes: names the file and is its
// integrity value.
const FILE = /^[A-Za-z0-9_-]{64}$/;

// Shared by every copy on the page, so the first loader is the only one.
const GUARD = Symbol.for('walkeros.moin');

interface MoinMessage {
  origin: string;
  data: unknown;
}

// Structural slices of the browser globals the loader touches. Core compiles
// without the DOM lib; see preview.ts for the same pattern.
export interface MoinGlobals {
  window?: {
    top: unknown;
    location: { search: string };
    sessionStorage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
    };
    addEventListener(
      type: 'message',
      listener: (event: MoinMessage) => void,
    ): void;
    removeEventListener(
      type: 'message',
      listener: (event: MoinMessage) => void,
    ): void;
  };
  URLSearchParams?: new (init: string) => { has(name: string): boolean };
}

/**
 * The Tag Mode loader. Armed only by `?elbMoin` or the tab flag it leaves in
 * sessionStorage, and only in the top frame; it then waits for one message
 * from `target.app` naming a script by its hash, and loads that script from
 * `target.base` with the same hash as its integrity. Not armed, it adds no
 * listener, makes no request and writes nothing.
 */
export function moin(target: MoinTarget = MOIN_PRODUCTION): void {
  runMoin(globalThis as MoinGlobals, target);
}

/** `moin` against explicit globals. */
export function runMoin(g: MoinGlobals, target: MoinTarget): void {
  // The loader runs first in every bundle: nothing here may stop it.
  try {
    const win = g.window;
    const USP = g.URLSearchParams;
    if (!win || !USP || win.top !== win || Reflect.get(win, GUARD)) return;

    let armed = new USP(win.location.search).has(MOIN_PARAM);
    try {
      const storage = win.sessionStorage;
      armed = armed || storage.getItem(MOIN_PARAM) === '1';
      if (armed) storage.setItem(MOIN_PARAM, '1');
    } catch {
      // Storage denied: the parameter alone arms.
    }
    if (!armed) return;
    Reflect.set(win, GUARD, true);

    const onMessage = (event: MoinMessage): void => {
      if (event.origin !== target.app) return;
      const data = event.data;
      if (typeof data !== 'object' || data === null) return;
      if (Reflect.get(data, 'elbMoin') !== 1) return;
      const file: unknown = Reflect.get(data, 'file');
      if (typeof file !== 'string' || !FILE.test(file)) return;
      win.removeEventListener('message', onMessage);
      void injectScript(
        `${target.base}${file}.js`,
        `sha384-${file.replace(/-/g, '+').replace(/_/g, '/')}`,
      );
    };
    win.addEventListener('message', onMessage);
  } catch {
    // A broken page global leaves the loader off.
  }
}
