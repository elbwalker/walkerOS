import type { Flow } from '@walkeros/core';
import { VENDOR_SCRIPT_MARKER } from '../loadVendor';

/**
 * The page a web step runs on in the conformance kit and the examples runner
 * of `@walkeros/collector/dev`. While a run is open, `navigator.sendBeacon`
 * and `XMLHttpRequest` answer through the kit's boundary (`sendWeb` runs on
 * them), and the scripts the run adds are tracked; closing the run restores
 * both and removes those scripts, so the next run starts on the page it
 * found (the page is loadVendor's once-per-src registry).
 */

const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function bodyText(body: unknown): string {
  if (body === undefined) return '';
  return typeof body === 'string' ? body : JSON.stringify(body);
}

/**
 * Replace one property for a run; returns its restore. A property that did
 * not exist is deleted again.
 */
function replace(target: object, key: string, value: unknown): () => void {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    value,
    configurable: true,
    writable: true,
  });
  return () => {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  };
}

function scriptsOf(doc: Document): HTMLScriptElement[] {
  return Array.from(doc.querySelectorAll('script'));
}

/**
 * `XMLHttpRequest` at the boundary: synchronous by default, as sendWeb opens
 * it; the async form answers late.
 */
function kitXMLHttpRequest(record: Flow.StepRecord) {
  return class KitXMLHttpRequest {
    status = 0;
    statusText = '';
    response: unknown = '';
    responseText = '';
    readyState = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onreadystatechange: (() => void) | null = null;
    private method = 'GET';
    private url = '';
    private async = true;

    open(method: string, url: string, async = true) {
      this.method = method;
      this.url = url;
      this.async = async;
      this.readyState = 1;
    }
    setRequestHeader() {}
    addEventListener(type: string, listener: () => void) {
      if (type === 'load') this.onload = listener;
      if (type === 'error') this.onerror = listener;
    }
    send(body?: unknown) {
      const { answer, settle } = record([
        'XMLHttpRequest',
        this.method,
        this.url,
        body,
      ]);
      const done = () => {
        settle();
        this.readyState = 4;
        if (answer.error) {
          if (!this.async) throw new Error('NetworkError');
          this.onerror?.();
          return;
        }
        this.status = answer.status ?? 200;
        this.statusText = answer.statusText ?? '';
        this.responseText = bodyText(answer.body);
        this.response = this.responseText;
        this.onreadystatechange?.();
        this.onload?.();
      };
      if (this.async) macrotask().then(done);
      else done();
    }
  };
}

export const page: Flow.StepPage = {
  open(record) {
    if (typeof document === 'undefined')
      throw new Error(
        'the web page needs a document: run it in a jsdom test environment',
      );
    const doc = document;
    const before = new Set(scriptsOf(doc));
    const added = () => scriptsOf(doc).filter((script) => !before.has(script));

    const beacon = (url: string, data?: unknown): boolean => {
      const { answer, settle } = record(['sendBeacon', url, data]);
      settle();
      return !answer.error && (answer.status ?? 200) < 400;
    };
    const restores = [
      replace(window, 'XMLHttpRequest', kitXMLHttpRequest(record)),
      replace(navigator, 'sendBeacon', beacon),
    ];

    return {
      globals: { document: doc },
      scripts: () => {
        const scripts = added();
        const marked = scripts.filter((script) =>
          script.hasAttribute(VENDOR_SCRIPT_MARKER),
        ).length;
        return { marked, unmarked: scripts.length - marked };
      },
      failScripts: () => {
        doc
          .querySelectorAll(`script[${VENDOR_SCRIPT_MARKER}]`)
          .forEach((script) => script.dispatchEvent(new Event('error')));
      },
      close: () => {
        restores.splice(0).forEach((restore) => restore());
        added().forEach((script) => script.remove());
      },
    };
  },
};
