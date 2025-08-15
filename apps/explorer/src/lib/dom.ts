/**
 * DOM Utilities
 * Shadow DOM management and element creation helpers
 */

import type { ShadowContext } from '../types';

/**
 * Create a shadow DOM context for component isolation
 */
export function createShadow(element: HTMLElement): ShadowContext {
  const shadow = element.attachShadow({ mode: 'open' });

  const container = document.createElement('div');
  container.className = 'elb-explorer-root';
  shadow.appendChild(container);

  return { shadow, container };
}

/**
 * Inject styles into shadow root or document head
 */
export function injectStyles(
  id: string,
  styles: string,
  target?: ShadowRoot | Document,
): void {
  const targetElement = target || document;
  const existingStyle = targetElement.querySelector(`#${id}`);

  if (existingStyle) return;

  const styleElement = document.createElement('style');
  styleElement.id = id;
  styleElement.textContent = styles;

  if (target instanceof ShadowRoot) {
    target.appendChild(styleElement);
  } else {
    document.head.appendChild(styleElement);
  }
}

/**
 * Create an element with optional attributes and children
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | boolean | undefined>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined) return;
      if (typeof value === 'boolean') {
        if (value) element.setAttribute(key, '');
      } else {
        element.setAttribute(key, String(value));
      }
    });
  }

  children.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Add event listener with cleanup function
 */
export function addListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | Document | Window,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
): () => void {
  element.addEventListener(event as string, handler as EventListener);
  return () =>
    element.removeEventListener(event as string, handler as EventListener);
}

/**
 * Batch DOM updates for performance
 */
export function batchUpdate(updates: (() => void)[]): void {
  requestAnimationFrame(() => {
    updates.forEach((update) => update());
  });
}

/**
 * Get computed styles with fallback
 */
export function getStyle(
  element: HTMLElement,
  property: string,
  fallback = '',
): string {
  const computed = window.getComputedStyle(element);
  return computed.getPropertyValue(property) || fallback;
}

/**
 * Set multiple styles at once
 */
export function setStyles(
  element: HTMLElement,
  styles: Record<string, string | number>,
): void {
  Object.entries(styles).forEach(([key, value]) => {
    element.style.setProperty(key, String(value));
  });
}

/**
 * Remove all children from an element
 */
export function clearChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Check if element is visible in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
