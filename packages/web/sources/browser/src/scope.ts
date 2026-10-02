import type { InitScope } from './types';

/**
 * Type guard: narrows `unknown` to an init scope (Element, Document or
 * ShadowRoot). Prefers the native `instanceof` check (works in browsers and
 * JSDOM) and falls back to the WhatWG DOM `nodeType` property for nodes whose
 * realm differs from the global constructors, or where those constructors
 * are not in scope at all (an iframe, a simulated page under Node).
 */
export function isDomScope(value: unknown): value is InitScope {
  if (!value || typeof value !== 'object') return false;
  if (typeof Element !== 'undefined' && value instanceof Element) return true;
  if (typeof Document !== 'undefined' && value instanceof Document) return true;
  if (typeof ShadowRoot !== 'undefined' && value instanceof ShadowRoot)
    return true;
  if ('nodeType' in value) {
    const nodeType = value.nodeType;
    // 1 = ELEMENT_NODE, 9 = DOCUMENT_NODE, 11 = DOCUMENT_FRAGMENT_NODE (the
    // node type of a ShadowRoot) per the WhatWG DOM standard. Accepting 11
    // lets `walker init` target a retained closed shadow root, which discovery
    // can never reach from the document.
    return nodeType === 1 || nodeType === 9 || nodeType === 11;
  }
  return false;
}
