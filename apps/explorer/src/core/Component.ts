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

export interface ComponentOptions {
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  autoMount?: boolean;
  useShadowDOM?: boolean;
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
  getShadowRoot(): ShadowRoot | null;
  getContentRoot(): HTMLElement | ShadowRoot;
  injectThemeCSS(css: string, id?: string): void;
  getCurrentTheme(): 'light' | 'dark';
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
 * Inject CSS custom properties inheritance into shadow DOM
 * This ensures theme variables are available inside shadow boundaries
 */
function injectShadowThemeInheritance(shadowRoot: ShadowRoot): void {
  const style = document.createElement('style');
  style.id = 'explorer-shadow-theme-inheritance';

  // CSS to inherit theme variables from parent document
  style.textContent = `
    /* Inherit CSS custom properties from parent document across shadow boundary */
    :host {
      /* Core theme variables */
      --explorer-bg-primary: var(--explorer-bg-primary, transparent);
      --explorer-bg-primary-opaque: var(--explorer-bg-primary-opaque, #ffffff);
      --explorer-bg-secondary: var(--explorer-bg-secondary, rgba(248, 250, 252, 0.8));
      --explorer-bg-tertiary: var(--explorer-bg-tertiary, rgba(241, 245, 249, 0.9));
      --explorer-bg-input: var(--explorer-bg-input, #fafafa);
      
      /* Text colors */
      --explorer-text-primary: var(--explorer-text-primary, #1f2937);
      --explorer-text-secondary: var(--explorer-text-secondary, #6b7280);
      --explorer-text-muted: var(--explorer-text-muted, #9ca3af);
      --explorer-text-inverse: var(--explorer-text-inverse, #ffffff);
      
      /* Border colors */
      --explorer-border-primary: var(--explorer-border-primary, #d1d5db);
      --explorer-border-secondary: var(--explorer-border-secondary, #e5e7eb);
      --explorer-border-focus: var(--explorer-border-focus, #3b82f6);
      
      /* Interactive colors */
      --explorer-interactive-primary: var(--explorer-interactive-primary, #2563eb);
      
      /* Detect theme context and set appropriate background */
      background: var(--explorer-bg-primary);
    }
    
    /* Theme detection - check if parent has data-theme */
    :host([data-theme="dark"]) {
      --explorer-bg-primary: var(--explorer-bg-primary, transparent);
      --explorer-bg-primary-opaque: var(--explorer-bg-primary-opaque, #1f2937);
      --explorer-bg-secondary: var(--explorer-bg-secondary, rgba(55, 65, 81, 0.8));
      --explorer-bg-tertiary: var(--explorer-bg-tertiary, rgba(75, 85, 99, 0.9));
      --explorer-bg-input: var(--explorer-bg-input, #111827);
      
      --explorer-text-primary: var(--explorer-text-primary, #f3f4f6);
      --explorer-text-secondary: var(--explorer-text-secondary, #d1d5db);
      --explorer-text-muted: var(--explorer-text-muted, #9ca3af);
      --explorer-text-inverse: var(--explorer-text-inverse, #1f2937);
      
      --explorer-border-primary: var(--explorer-border-primary, #374151);
      --explorer-border-secondary: var(--explorer-border-secondary, #4b5563);
    }
    
    /* Shadow container inherits from host */
    .explorer-shadow-container {
      background: inherit;
      color: var(--explorer-text-primary);
      font-family: inherit;
    }
  `;

  shadowRoot.insertBefore(style, shadowRoot.firstChild);
}

/**
 * Get current theme from document context
 */
function getCurrentDocumentTheme(): 'light' | 'dark' {
  // Check website context first
  const htmlTheme = document.documentElement.getAttribute('data-theme');
  if (htmlTheme === 'light' || htmlTheme === 'dark') {
    return htmlTheme;
  }

  // Check for dark class (common pattern)
  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }

  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
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

      // Inject CSS custom properties inheritance for shadow DOM
      injectShadowThemeInheritance(shadowRoot);
    } catch (error) {
      console.warn(
        'Failed to create shadow DOM, falling back to light DOM:',
        error,
      );
      shadowRoot = null;
    }
  }

  // Theme management
  let currentTheme = options.theme || 'auto';

  const updateTheme = () => {
    const targetElement =
      (shadowRoot?.firstElementChild as HTMLElement) || element;

    // Always add explorer class for CSS targeting
    targetElement.classList.add('explorer-component');

    // Get the resolved theme
    let resolvedTheme: 'light' | 'dark';
    if (currentTheme === 'auto') {
      resolvedTheme = getCurrentDocumentTheme();
    } else {
      resolvedTheme = currentTheme;
    }

    // Check if we're in a website context (html has data-theme)
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme && (htmlTheme === 'light' || htmlTheme === 'dark')) {
      // Website context - mirror the parent theme for consistency
      targetElement.setAttribute('data-theme', htmlTheme);
      // Also set on host element for shadow DOM CSS selectors
      if (shadowRoot) {
        element.setAttribute('data-theme', htmlTheme);
      }
    } else {
      // Standalone context - apply resolved theme
      targetElement.setAttribute('data-theme', resolvedTheme);
      // Also set on host element for shadow DOM CSS selectors
      if (shadowRoot) {
        element.setAttribute('data-theme', resolvedTheme);
      }
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

    setTheme(theme: 'light' | 'dark') {
      currentTheme = theme;
      updateTheme();
      api.emit('theme-change', theme);
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

    injectThemeCSS(css: string, id?: string): void {
      if (destroyed) return;

      const targetRoot = shadowRoot || document.head;
      const styleId = id || `explorer-theme-${api.id}`;

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

    getCurrentTheme(): 'light' | 'dark' {
      if (destroyed) return 'light';

      if (currentTheme === 'auto') {
        return getCurrentDocumentTheme();
      } else {
        return currentTheme;
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
