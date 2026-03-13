import type { Trigger } from '@walkeros/core';

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
 * Browser source trigger.
 * Converts step example `in` data into DOM elements and dispatches events.
 *
 * Load triggers: sets URL/title before source init (returns void).
 * Interactive triggers (click, submit): injects DOM and dispatches event after source init (returns trigger fn).
 */
export const trigger: Trigger.SetupFn = (input, env) => {
  if (!input || typeof input !== 'object') return;
  const data = input as BrowserInput;
  const doc = env.document;
  const win = env.window;

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
