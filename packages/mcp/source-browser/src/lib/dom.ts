import { JSDOM } from 'jsdom';

/**
 * Typed view of globalThis for assigning JSDOM globals in Node.js.
 * Walker parser functions read from globalThis.document internally.
 */
interface DomGlobals {
  document?: Document;
  window?: Window & typeof globalThis;
  // Intentionally loose: JSDOM may not provide ShadowRoot, so we polyfill with a stub class
  ShadowRoot?: { new (): unknown; prototype: unknown };
}

const globals = globalThis as unknown as DomGlobals;

/**
 * Execute a function with JSDOM globals (document, window) temporarily set.
 * Walker parser functions read from globalThis.document internally.
 */
export function withDom<T>(html: string, fn: (dom: JSDOM) => T): T {
  const dom = new JSDOM(html);
  const prevDoc = globals.document;
  const prevWin = globals.window;

  try {
    globals.document = dom.window.document;
    globals.window = dom.window as unknown as Window & typeof globalThis;
    // Polyfill ShadowRoot if missing (JSDOM may not provide it)
    if (!globals.ShadowRoot) {
      globals.ShadowRoot =
        (dom.window as unknown as DomGlobals).ShadowRoot || class ShadowRoot {};
    }
    return fn(dom);
  } finally {
    if (prevDoc !== undefined) {
      globals.document = prevDoc;
    } else {
      delete globals.document;
    }
    if (prevWin !== undefined) {
      globals.window = prevWin;
    } else {
      delete globals.window;
    }
  }
}
