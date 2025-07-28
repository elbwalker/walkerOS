/**
 * Core Component Factory - Base for all walkerOS Explorer components
 *
 * Provides:
 * - Isolated state per instance
 * - Unique ID generation to prevent conflicts
 * - Event system for component communication
 * - Lifecycle management
 * - DOM utilities
 * - Enhanced shadow DOM theme inheritance
 */

import { setElementTheme, detectTheme } from './css-theme-system';

export interface ComponentOptions {
  className?: string;
  autoMount?: boolean;
  useShadowDOM?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  [key: string]: unknown;
}

export interface ComponentAPI {
  id: string;
  mount(): void;
  unmount(): void;
  destroy(): void;
  on(event: string, handler: Function): () => void;
  emit(event: string, data?: unknown): void;
  getElement(): HTMLElement | null;
  getShadowRoot(): ShadowRoot | null;
  getContentRoot(): HTMLElement | ShadowRoot;
  injectCSS(css: string, id?: string): void;
}

// Global registry to track all component instances
const componentRegistry = new Map<string, ComponentAPI>();

/**
 * Generate unique ID for component instances
 */
export function generateUniqueId(prefix = 'explorer'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Get element from selector or HTMLElement
 */
function getElement(elementOrSelector: HTMLElement | string): HTMLElement {
  if (typeof elementOrSelector === 'string') {
    const element = document.querySelector(elementOrSelector);
    if (!element) {
      throw new Error(`Element not found: ${elementOrSelector}`);
    }
    return element as HTMLElement;
  }
  return elementOrSelector;
}

/**
 * Core Component Factory
 * Creates isolated component instances with unique IDs and event systems
 */
export function createComponent(
  elementOrSelector: HTMLElement | string,
  options: ComponentOptions = {},
): ComponentAPI {
  const element = getElement(elementOrSelector);

  // Check for existing component instance to prevent duplicates
  const existingId = element.getAttribute('data-explorer-component');
  if (existingId && componentRegistry.has(existingId)) {
    console.warn(
      `Component already exists on element, destroying existing instance: ${existingId}`,
    );
    const existingComponent = componentRegistry.get(existingId);
    existingComponent?.destroy();
  }

  const id = generateUniqueId();

  // Component state (isolated per instance)
  let mounted = false;
  let destroyed = false;
  const eventListeners = new Map<string, Set<Function>>();
  const cleanupFunctions: Function[] = [];
  let shadowRoot: ShadowRoot | null = null;

  // Set unique ID on element to prevent conflicts
  if (!element.id) {
    element.id = id;
  }

  // Add component marker
  element.setAttribute('data-explorer-component', id);

  // Create shadow DOM if requested and supported
  if (options.useShadowDOM && element.attachShadow) {
    try {
      shadowRoot = element.attachShadow({ mode: 'open' });
      // Add unique class to shadow root for styling
      const shadowContainer = document.createElement('div');
      shadowContainer.className = 'explorer-shadow-container';
      shadowContainer.setAttribute('data-explorer-component', id);
      shadowRoot.appendChild(shadowContainer);
    } catch (error) {
      console.warn(
        'Failed to create shadow DOM, falling back to light DOM:',
        error,
      );
      shadowRoot = null;
    }
  }

  // Basic component setup
  const setupComponent = () => {
    const targetElement =
      (shadowRoot?.firstElementChild as HTMLElement) || element;

    // Always add explorer class for CSS targeting
    targetElement.classList.add('explorer-component');
  };

  // Component API
  const api: ComponentAPI = {
    id,

    mount() {
      if (mounted || destroyed) return;

      mounted = true;
      setupComponent();

      // Add component class
      if (options.className) {
        element.classList.add(options.className);
      }

      // Handle theme setting
      if (options.theme) {
        if (options.theme === 'auto') {
          const detectedTheme = detectTheme();
          setElementTheme(element, detectedTheme);
        } else {
          setElementTheme(element, options.theme);
        }
      }

      api.emit('mount');
    },

    unmount() {
      if (!mounted || destroyed) return;

      mounted = false;
      api.emit('unmount');
    },

    destroy() {
      if (destroyed) return;

      destroyed = true;

      if (mounted) {
        api.unmount();
      }

      // Emit destroy event before clearing listeners
      api.emit('destroy');

      // Clear all event listeners
      eventListeners.clear();

      // Run cleanup functions
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;

      // Remove component marker and classes
      element.removeAttribute('data-explorer-component');
      element.classList.remove('explorer-component');

      // Clean up shadow DOM
      if (shadowRoot) {
        shadowRoot.innerHTML = '';
        shadowRoot = null;
      }

      // Remove from registry
      componentRegistry.delete(id);
    },

    on(event: string, handler: Function): () => void {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }

      const handlers = eventListeners.get(event)!;
      handlers.add(handler);

      // Return unsubscribe function
      return () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventListeners.delete(event);
        }
      };
    },

    emit(event: string, data?: unknown) {
      const handlers = eventListeners.get(event);
      if (!handlers) return;

      handlers.forEach((handler) => {
        try {
          handler(data, api);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      });
    },

    getElement() {
      return destroyed ? null : element;
    },

    getShadowRoot() {
      return destroyed ? null : shadowRoot;
    },

    getContentRoot(): HTMLElement | ShadowRoot {
      if (destroyed) return element;
      return (shadowRoot?.firstElementChild as HTMLElement) || element;
    },

    injectCSS(css: string, id?: string): void {
      if (destroyed) return;

      const targetRoot = shadowRoot || document.head;
      const styleId = id || `explorer-css-${api.id}`;

      // Remove existing style with same ID
      const existingStyle = targetRoot.querySelector(`#${styleId}`);
      if (existingStyle) {
        existingStyle.remove();
      }

      // Create and inject new style
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = css;

      if (shadowRoot) {
        shadowRoot.appendChild(style);
      } else {
        document.head.appendChild(style);
      }
    },
  };

  // Register component
  componentRegistry.set(id, api);

  // Auto-mount if requested
  if (options.autoMount !== false) {
    api.mount();
  }

  return api;
}

/**
 * Get all active component instances
 */
export function getAllComponents(): ComponentAPI[] {
  return Array.from(componentRegistry.values());
}

/**
 * Get component by ID
 */
export function getComponent(id: string): ComponentAPI | undefined {
  return componentRegistry.get(id);
}

/**
 * Destroy all components (useful for cleanup)
 */
export function destroyAllComponents(): void {
  const components = Array.from(componentRegistry.values());
  components.forEach((component) => component.destroy());
}

/**
 * Find components by selector
 */
export function findComponents(selector: string): ComponentAPI[] {
  const elements = document.querySelectorAll(selector);
  const components: ComponentAPI[] = [];

  elements.forEach((element) => {
    const componentId = element.getAttribute('data-explorer-component');
    if (componentId) {
      const component = componentRegistry.get(componentId);
      if (component) {
        components.push(component);
      }
    }
  });

  return components;
}
