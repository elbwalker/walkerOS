// Structural slices of the browser globals the injector touches. Core
// compiles without the DOM lib, so document and the timer functions are
// untyped here; reading them off globalThis behind guards is the
// batchedPoster precedent.
interface ScriptEl {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  async: boolean;
  setAttribute(name: string, value: string): void;
  parentNode: { removeChild(el: ScriptEl): void } | null;
}

interface InjectGlobals {
  document?: {
    head: { appendChild(el: ScriptEl): void };
    createElement(tag: 'script'): ScriptEl;
  };
  setTimeout?: (fn: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
}

/**
 * Append an async `<script>` that only runs if its bytes match `integrity`.
 *
 * Resolves true on load and false on error, on a missing document, when the
 * page refuses the script (a Trusted Types policy throws on a plain string
 * URL), or when `timeoutMs` passes first; a script that did not load is
 * removed. Without `timeoutMs` it waits for load or error alone. Never
 * rejects.
 */
export function injectScript(
  src: string,
  integrity: string,
  timeoutMs?: number,
): Promise<boolean> {
  const G = globalThis as InjectGlobals;
  return new Promise((resolve) => {
    let script: ScriptEl | undefined;
    let settled = false;
    let timer: number | undefined;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
      if (timer !== undefined) G.clearTimeout?.(timer);
      if (!ok && script?.parentNode) script.parentNode.removeChild(script);
    };
    try {
      const doc = G.document;
      if (!doc) {
        done(false);
        return;
      }
      script = doc.createElement('script');
      if (timeoutMs !== undefined)
        timer = G.setTimeout?.(() => done(false), timeoutMs);
      script.onload = () => done(true);
      script.onerror = () => done(false);
      script.setAttribute('integrity', integrity);
      script.setAttribute('crossorigin', 'anonymous');
      script.async = true;
      script.src = src;
      doc.head.appendChild(script);
    } catch {
      done(false);
    }
  });
}
