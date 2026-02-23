import { JSDOM } from 'jsdom';

/**
 * Execute a function with JSDOM globals (document, window) temporarily set.
 * Walker parser functions read from globalThis.document internally.
 */
export function withDom<T>(html: string, fn: (dom: JSDOM) => T): T {
  const dom = new JSDOM(html);
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  try {
    (globalThis as any).document = dom.window.document;
    (globalThis as any).window = dom.window;
    // Polyfill ShadowRoot if missing (JSDOM may not provide it)
    if (!(globalThis as any).ShadowRoot) {
      (globalThis as any).ShadowRoot =
        dom.window.ShadowRoot || class ShadowRoot {};
    }
    return fn(dom);
  } finally {
    if (prevDoc !== undefined) {
      (globalThis as any).document = prevDoc;
    } else {
      delete (globalThis as any).document;
    }
    if (prevWin !== undefined) {
      (globalThis as any).window = prevWin;
    } else {
      delete (globalThis as any).window;
    }
  }
}
