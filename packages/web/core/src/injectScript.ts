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
  return new Promise((resolve) => {
    let script: HTMLScriptElement | undefined;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
      if (timer !== undefined) clearTimeout(timer);
      if (!ok && script?.parentNode) script.parentNode.removeChild(script);
    };
    try {
      if (typeof document === 'undefined') {
        done(false);
        return;
      }
      script = document.createElement('script');
      if (timeoutMs !== undefined)
        timer = setTimeout(() => done(false), timeoutMs);
      script.onload = () => done(true);
      script.onerror = () => done(false);
      script.setAttribute('integrity', integrity);
      script.setAttribute('crossorigin', 'anonymous');
      script.async = true;
      script.src = src;
      document.head.appendChild(script);
    } catch {
      done(false);
    }
  });
}
