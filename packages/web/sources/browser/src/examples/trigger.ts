import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

type BrowserTriggerType =
  | 'load'
  | 'click'
  | 'submit'
  | 'hover'
  | 'scroll'
  | 'impression'
  | 'visible';

interface LoadOptions {
  url?: string;
  title?: string;
  referrer?: string;
}

interface BrowserInput {
  trigger: string;
  url?: string;
  title?: string;
  referrer?: string;
  element?: string;
  attributes?: Record<string, string>;
  children?: Record<string, string>[];
  context?: Record<string, unknown>;
  globals?: Record<string, unknown>;
}

/**
 * Browser source createTrigger.
 *
 * Injects HTML into the DOM, lazily starts the flow, then dispatches
 * native browser events. Mirrors real-world behavior: HTML exists on
 * the page, walker.js loads, source scans DOM and sets up listeners.
 *
 * @example
 * const { trigger } = await createTrigger(config);
 * await trigger('click', 'button')('<button data-elb="cta">Click</button>');
 */
const createTrigger: Trigger.CreateFn<string, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;
  const doc = document;
  const win = window;

  const trigger: Trigger.Fn<string, void> =
    (type?: string, opts?: unknown) => async (content: string) => {
      // 1. Set up environment for load triggers (URL, title, referrer)
      if (type === 'load' || !type) {
        const loadOpts =
          typeof opts === 'object' && opts !== null
            ? (opts as LoadOptions)
            : {};
        if (loadOpts.url) {
          const urlObj = new URL(loadOpts.url);
          win.history.replaceState({}, '', urlObj.pathname);
        }
        if (loadOpts.title) doc.title = loadOpts.title;
        if (loadOpts.referrer) {
          Object.defineProperty(doc, 'referrer', {
            value: loadOpts.referrer,
            configurable: true,
          });
        }
      }

      // 2. Inject HTML content into DOM — replaces to create fresh state
      if (content) doc.body.innerHTML = content;

      // 3. Lazy startFlow — first call initializes the flow
      //    Default run: true so sources scan the DOM and set up listeners
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
      }

      // 4. For load triggers, source already scanned DOM during init — done
      if (!type || type === 'load') return;

      // 5. Interactive triggers — find target and dispatch event
      const selector = typeof opts === 'string' ? opts : undefined;
      const target = selector ? doc.querySelector(selector) : null;

      const dispatch = (event: Event) => {
        if (!target) {
          console.warn(`Trigger: element not found for selector "${selector}"`);
          return;
        }
        target.dispatchEvent(event);
      };

      switch (type) {
        case 'click':
          dispatch(new MouseEvent('click', { bubbles: true }));
          break;
        case 'submit':
          dispatch(new Event('submit', { bubbles: true }));
          break;
        case 'hover':
          dispatch(new MouseEvent('mouseenter', { bubbles: true }));
          break;
        case 'scroll':
          Object.defineProperty(win, 'scrollY', {
            value:
              typeof opts === 'object' && opts !== null
                ? (((opts as Record<string, unknown>).distance as number) ??
                  500)
                : 500,
            configurable: true,
          });
          win.dispatchEvent(new Event('scroll'));
          break;
        case 'impression':
        case 'visible':
          if (target) {
            console.warn(
              `Trigger: "${type}" requires IntersectionObserver mock in test environment`,
            );
          }
          break;
        default:
          console.warn(`Trigger: unknown type "${type}"`);
      }
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/**
 * Browser source trigger (legacy).
 * Converts step example `in` data into DOM elements and dispatches events.
 */
const trigger = (
  input: unknown,
  env: Record<string, unknown>,
): void | (() => void) => {
  if (!input || typeof input !== 'object') return;
  const data = input as BrowserInput;
  const doc = env.document as Document;
  const win = env.window as Window & typeof globalThis;

  const injectDOM = () => {
    if (!data.attributes) return;

    const tag = data.element?.match(/^(\w+)/)?.[1] || 'div';
    const el = doc.createElement(tag);

    for (const [key, value] of Object.entries(data.attributes)) {
      el.setAttribute(key, value);
    }

    if (data.children) {
      for (const childAttrs of data.children) {
        const child = doc.createElement('div');
        for (const [key, value] of Object.entries(childAttrs)) {
          child.setAttribute(key, value);
        }
        el.appendChild(child);
      }
    }

    doc.body.appendChild(el);
    return el;
  };

  const isLoad = !data.trigger || data.trigger === 'load';

  if (isLoad) {
    if (data.url) {
      const urlObj = new URL(data.url);
      win.history.replaceState({}, '', urlObj.pathname);
    }
    if (data.title) {
      doc.title = data.title;
    }
    if (data.referrer) {
      Object.defineProperty(doc, 'referrer', { value: data.referrer });
    }
    injectDOM();
    return;
  }

  // Interactive triggers: inject DOM and dispatch event AFTER source init
  return () => {
    const el = injectDOM();
    if (!el) return;

    switch (data.trigger) {
      case 'click':
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        break;
      case 'submit':
        el.dispatchEvent(new Event('submit', { bubbles: true }));
        break;
      case 'hover':
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        break;
      case 'scroll':
        win.dispatchEvent(new Event('scroll'));
        break;
    }
  };
};

export { createTrigger, trigger };
