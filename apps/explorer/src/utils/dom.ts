/**
 * DOM Utilities - Helper functions for DOM manipulation
 *
 * Features:
 * - Safe element creation and manipulation
 * - Event delegation
 * - CSS injection
 * - Element queries with error handling
 */

/**
 * Create element with attributes and styles
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string> = {},
  styles: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  });

  // Set styles
  Object.entries(styles).forEach(([property, value]) => {
    (element.style as any)[property] = value;
  });

  return element;
}

/**
 * Safe element query with error handling
 */
export function getElement(selector: string | HTMLElement): HTMLElement {
  if (typeof selector === 'string') {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    return element as HTMLElement;
  }
  return selector;
}

/**
 * Safe element query that returns null if not found
 */
export function findElement(selector: string): HTMLElement | null {
  try {
    return getElement(selector);
  } catch {
    return null;
  }
}

/**
 * Get all elements matching a selector
 */
export function getElements(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
}

/**
 * Check if element matches selector
 */
export function matches(element: Element, selector: string): boolean {
  return element.matches ? element.matches(selector) : false;
}

/**
 * Find closest parent element matching selector
 */
export function closest(element: Element, selector: string): Element | null {
  return element.closest ? element.closest(selector) : null;
}

/**
 * Add event listener with automatic cleanup
 */
export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: Element | Document | Window,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): () => void {
  element.addEventListener(event as string, handler as EventListener, options);

  return () => {
    element.removeEventListener(
      event as string,
      handler as EventListener,
      options,
    );
  };
}

/**
 * Event delegation helper
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  container: Element,
  selector: string,
  event: K,
  handler: (event: HTMLElementEventMap[K], target: Element) => void,
): () => void {
  const delegateHandler = (e: Event) => {
    const target = (e.target as Element)?.closest?.(selector);
    if (target && container.contains(target)) {
      handler(e as HTMLElementEventMap[K], target);
    }
  };

  return addEventListener(container, event, delegateHandler);
}

/**
 * Inject CSS into document head
 */
export function injectCSS(css: string, id?: string): HTMLStyleElement {
  // Remove existing style with same ID
  if (id) {
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
  }

  const style = createElement('style', {
    type: 'text/css',
    ...(id && { id }),
  });

  style.textContent = css;
  document.head.appendChild(style);

  return style;
}

/**
 * Get computed style value
 */
export function getComputedStyleValue(
  element: Element,
  property: string,
): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Check if element is visible
 */
export function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    parseFloat(style.opacity) > 0
  );
}

/**
 * Get element dimensions
 */
export function getDimensions(element: Element) {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
  };
}

/**
 * Scroll element into view smoothly
 */
export function scrollIntoView(
  element: Element,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'nearest' },
): void {
  if (element.scrollIntoView) {
    element.scrollIntoView(options);
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = createElement('textarea', {
        value: text,
        style: 'position: absolute; left: -999999px',
      });

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch {
        document.body.removeChild(textArea);
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Create a DocumentFragment from HTML string
 */
export function createFragment(html: string): DocumentFragment {
  const template = createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Safe innerHTML replacement
 */
export function setHTML(element: Element, html: string): void {
  // Clear existing content
  element.innerHTML = '';

  // Create fragment and append
  const fragment = createFragment(html);
  element.appendChild(fragment);
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHTML(text: string): string {
  const div = createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Debounced resize observer
 */
export function observeResize(
  element: Element,
  callback: (entry: ResizeObserverEntry) => void,
  debounceMs = 100,
): () => void {
  if (!window.ResizeObserver) {
    // Fallback for browsers without ResizeObserver
    const handler = () => callback({} as ResizeObserverEntry);
    const debouncedHandler = debounce(handler, debounceMs);

    return addEventListener(window, 'resize', debouncedHandler);
  }

  const debouncedCallback = debounce((entries: ResizeObserverEntry[]) => {
    entries.forEach(callback);
  }, debounceMs);

  const observer = new ResizeObserver(debouncedCallback);
  observer.observe(element);

  return () => observer.disconnect();
}

/**
 * Mutation observer helper
 */
export function observeMutations(
  element: Element,
  callback: (mutations: MutationRecord[]) => void,
  options: MutationObserverInit = { childList: true, subtree: true },
): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(element, options);

  return () => observer.disconnect();
}

/**
 * Simple debounce utility
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element, threshold = 0): boolean {
  const rect = element.getBoundingClientRect();
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.top >= -threshold &&
    rect.left >= -threshold &&
    rect.bottom <= windowHeight + threshold &&
    rect.right <= windowWidth + threshold
  );
}

/**
 * Get unique selector for element
 */
export function getUniqueSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];

  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();

    if (element.className) {
      selector += '.' + element.className.trim().split(/\s+/).join('.');
    }

    // Add nth-child if needed for uniqueness
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      if (siblings.length > 1) {
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    element = element.parentElement as Element;
  }

  return path.join(' > ');
}
