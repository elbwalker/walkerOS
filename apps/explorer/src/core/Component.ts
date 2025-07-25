/**
 * Core Component Factory - Base for all walkerOS Explorer components
 *
 * Provides:
 * - Isolated state per instance
 * - Unique ID generation to prevent conflicts
 * - Event system for component communication
 * - Lifecycle management
 * - DOM utilities
 */

export interface ComponentOptions {
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  autoMount?: boolean;
  [key: string]: unknown;
}

export interface ComponentAPI {
  id: string;
  mount(): void;
  unmount(): void;
  destroy(): void;
  on(event: string, handler: Function): () => void;
  emit(event: string, data?: unknown): void;
  setTheme(theme: 'light' | 'dark'): void;
  getElement(): HTMLElement | null;
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
  const id = generateUniqueId();
  const element = getElement(elementOrSelector);

  // Component state (isolated per instance)
  let mounted = false;
  let destroyed = false;
  const eventListeners = new Map<string, Set<Function>>();
  const cleanupFunctions: Function[] = [];

  // Set unique ID on element to prevent conflicts
  if (!element.id) {
    element.id = id;
  }

  // Add component marker
  element.setAttribute('data-explorer-component', id);

  // Theme management
  let currentTheme = options.theme || 'auto';

  const updateTheme = () => {
    // Check if we're in a website context (html has data-theme)
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme && (htmlTheme === 'light' || htmlTheme === 'dark')) {
      // Website context - don't set data-theme, just add explorer class for CSS targeting
      element.classList.add('explorer-component');
      return;
    }

    // Standalone context - apply theme normally
    if (currentTheme === 'auto') {
      // Auto-detect theme from document or media queries
      const isDark =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      element.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      element.setAttribute('data-theme', currentTheme);
    }
  };

  // Watch for theme changes on document
  const themeObserver = new MutationObserver(() => {
    // Re-evaluate theme when document changes
    updateTheme();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  cleanupFunctions.push(() => themeObserver.disconnect());

  // Watch for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    if (currentTheme === 'auto') updateTheme();
  };
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  cleanupFunctions.push(() =>
    mediaQuery.removeEventListener('change', handleSystemThemeChange),
  );

  // Component API
  const api: ComponentAPI = {
    id,

    mount() {
      if (mounted || destroyed) return;

      mounted = true;
      updateTheme();

      // Add component class
      if (options.className) {
        element.classList.add(options.className);
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

      // Remove component marker and theme-related attributes/classes
      element.removeAttribute('data-explorer-component');
      element.removeAttribute('data-theme');
      element.classList.remove('explorer-component');

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

    setTheme(theme: 'light' | 'dark') {
      currentTheme = theme;
      updateTheme();
      api.emit('theme-change', theme);
    },

    getElement() {
      return destroyed ? null : element;
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
