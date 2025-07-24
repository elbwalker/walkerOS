/**
 * Base class for all vanilla JS components
 * Provides common functionality like element creation, styling, and cleanup
 */
export abstract class BaseComponent {
  protected container: HTMLElement;
  protected shadowRoot?: ShadowRoot;
  protected destroyed = false;
  private eventListeners: Array<{
    element: Element | Document | Window;
    event: string;
    handler: EventListener;
    options?: boolean | AddEventListenerOptions;
  }> = [];

  constructor(
    container: HTMLElement | string,
    options: { useShadowDOM?: boolean; autoInitialize?: boolean } = {},
  ) {
    // Handle both string selectors and HTMLElement
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Element not found: ${container}`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = container;
    }

    // Create shadow DOM if requested
    if (options.useShadowDOM && this.container.attachShadow) {
      this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    }

    // Only auto-initialize if not explicitly disabled
    if (options.autoInitialize !== false) {
      this.initialize();
    }
  }

  /**
   * Abstract method for component initialization - must be implemented by subclasses
   */
  protected abstract initialize(): void;

  /**
   * Get the root element (either shadow root or container)
   */
  protected getRoot(): HTMLElement | ShadowRoot {
    return this.shadowRoot || this.container;
  }

  /**
   * Create an element with optional attributes and styles
   */
  protected createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes: Record<string, string> = {},
    styles: Partial<CSSStyleDeclaration> = {},
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    // Set styles
    Object.entries(styles).forEach(([key, value]) => {
      if (value !== undefined) {
        (element.style as any)[key] = value;
      }
    });

    return element;
  }

  /**
   * Add event listener and track it for cleanup
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  protected addEventListener<K extends keyof DocumentEventMap>(
    element: Document,
    event: K,
    handler: (this: Document, ev: DocumentEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  protected addEventListener<K extends keyof WindowEventMap>(
    element: Window,
    event: K,
    handler: (this: Window, ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  protected addEventListener(
    element: Element | Document | Window,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): void {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Inject CSS styles into the component
   */
  protected injectStyles(css: string): void {
    const style = this.createElement('style');
    style.textContent = css;

    const root = this.getRoot();
    if (root instanceof ShadowRoot) {
      root.appendChild(style);
    } else {
      // If not using shadow DOM, add to document head to avoid duplicates
      const existingStyle = document.head.querySelector(
        `style[data-component="${this.constructor.name}"]`,
      );
      if (!existingStyle) {
        style.setAttribute('data-component', this.constructor.name);
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Create a container div with proper styling
   */
  protected createContainer(
    className?: string,
    styles: Partial<CSSStyleDeclaration> = {},
  ): HTMLDivElement {
    return this.createElement('div', className ? { class: className } : {}, {
      boxSizing: 'border-box',
      ...styles,
    });
  }

  /**
   * Debounce a function call
   */
  protected debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Check if component is destroyed
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy(): void {
    if (this.destroyed) return;

    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.eventListeners = [];

    // Remove component styles from document head if not using shadow DOM
    if (!this.shadowRoot) {
      const style = document.head.querySelector(
        `style[data-component="${this.constructor.name}"]`,
      );
      if (style) {
        style.remove();
      }
    }

    // Clear container
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
    } else {
      this.container.innerHTML = '';
    }

    this.destroyed = true;
    this.onDestroy();
  }

  /**
   * Hook for subclasses to perform additional cleanup
   */
  protected onDestroy(): void {
    // Override in subclasses if needed
  }
}
