/**
 * Preview Node
 * Renders HTML in shadow DOM and simulates DOM interactions
 */

import { BaseNode } from './base';
import type {
  GraphNode,
  NodeConfig,
  DOMEvent,
  CodeContent,
} from '../graph/types';
import { createShadow } from '../lib/dom';

export class PreviewNode extends BaseNode<string | CodeContent, DOMEvent[]> {
  private container?: HTMLElement;
  private shadowRoot?: ShadowRoot;
  private previewContainer?: HTMLElement;
  private domEvents: DOMEvent[] = [];
  private eventListeners: Map<HTMLElement, EventListener> = new Map();

  constructor(config: {
    id: string;
    position?: { x: number; y: number };
    nodeConfig?: NodeConfig;
  }) {
    super({ ...config, type: 'preview' });
  }

  protected initializePorts(): GraphNode['ports'] {
    return {
      input: [
        {
          id: 'code',
          type: 'input',
          dataType: 'code',
          label: 'Code Input',
          required: true,
          accepts: ['code', 'html'],
        },
      ],
      output: [
        {
          id: 'dom',
          type: 'output',
          dataType: 'dom',
          label: 'DOM Events',
        },
        {
          id: 'element',
          type: 'output',
          dataType: 'element',
          label: 'Shadow Root',
        },
      ],
    };
  }

  protected getDefaultLabel(): string {
    return 'HTML Preview';
  }

  async process(input: string | CodeContent): Promise<DOMEvent[]> {
    // Clear previous events and listeners
    this.clearEventListeners();
    this.domEvents = [];

    // Extract content from input
    const content = this.extractContent(input);

    // Render HTML, CSS, and JS in shadow DOM
    await this.renderContent(content);

    // Set up DOM event listeners
    this.setupDOMListeners();

    // Return DOM events (will be populated by event listeners)
    return this.domEvents;
  }

  /**
   * Extract content from input
   */
  private extractContent(input: string | CodeContent): CodeContent {
    if (typeof input === 'string') {
      // Backward compatibility: treat string as HTML
      return { html: input, css: '', js: '' };
    }
    return input;
  }

  /**
   * Render content (HTML, CSS, JS) in shadow DOM
   */
  private async renderContent(content: CodeContent): Promise<void> {
    // Create container if not exists
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.style.cssText =
        'width: 100%; height: 100%; position: relative; overflow: auto;';
      this.container.setAttribute('data-preview-node', this.getId());
    }

    // Create shadow DOM if not exists
    if (!this.shadowRoot) {
      const { shadow, container } = createShadow(this.container);
      this.shadowRoot = shadow;
      this.previewContainer = container;

      // Add enhanced styles to shadow DOM
      const styles = document.createElement('style');
      styles.textContent = `
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        .preview-content { 
          margin: 0; 
          padding: 16px; 
          font-family: system-ui, sans-serif;
          width: 100%;
          box-sizing: border-box;
        }
        button {
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin: 4px;
        }
        button:hover {
          background: #2563eb;
        }
        a {
          color: #3b82f6;
          text-decoration: none;
          padding: 4px 8px;
        }
        a:hover {
          text-decoration: underline;
        }
        input, textarea, select {
          padding: 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          margin: 4px;
        }
        form div {
          margin: 8px 0;
        }
        label {
          display: inline-block;
          width: 100px;
        }
        img {
          max-width: 100%;
          height: auto;
        }
      `;
      this.shadowRoot.appendChild(styles);
    }

    // Clear and set new HTML wrapped in a content div
    if (this.previewContainer) {
      this.previewContainer.innerHTML = `<div class="preview-content">${content.html}</div>`;
    }

    // Inject CSS if provided
    if (content.css.trim()) {
      this.injectCSS(content.css);
    }

    // Execute JavaScript if provided
    if (content.js.trim()) {
      this.executeJS(content.js);
    }

    // DOM is now ready for interaction
  }

  /**
   * Set up DOM event listeners
   */
  private setupDOMListeners(): void {
    if (!this.previewContainer) return;

    // Clear existing listeners
    this.clearEventListeners();

    // Find all elements with data-elb attributes
    const walkerElements = this.previewContainer.querySelectorAll(
      '[data-elb], [data-elbaction]',
    );

    walkerElements.forEach((element) => {
      // Listen for clicks on elements with data-elbaction
      if (element.hasAttribute('data-elbaction')) {
        const listener = (event: Event) => {
          this.handleDOMEvent(event, element as HTMLElement);
        };

        // Parse action type from data-elbaction (e.g., "click:add" -> "click")
        const actionAttr = element.getAttribute('data-elbaction') || '';
        const [eventType] = actionAttr.split(':');

        if (eventType) {
          element.addEventListener(eventType, listener);
          this.eventListeners.set(element as HTMLElement, listener);
        }
      }

      // Also handle load events for elements with load actions
      const actionAttr = element.getAttribute('data-elbaction') || '';
      if (actionAttr.startsWith('load:')) {
        // Simulate load event immediately
        this.handleDOMEvent(new Event('load'), element as HTMLElement);
      }
    });
  }

  /**
   * Handle DOM events
   */
  private handleDOMEvent(event: Event, element: HTMLElement): void {
    // Extract walker attributes
    const attributes: Record<string, any> = {};

    // Get all data-elb* attributes
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith('data-elb')) {
        const key = attr.name.replace('data-elb', '').replace(/^-/, '');
        attributes[key] = attr.value;
      }
    });

    // Create DOM event
    const domEvent: DOMEvent = {
      type: event.type,
      target: element.tagName.toLowerCase(),
      data: attributes,
      timestamp: Date.now(),
    };

    // Add to events list
    this.domEvents.push(domEvent);
    this.setOutputValue(this.domEvents);

    // Emit for real-time updates
    if (this.onDOMEvent) {
      this.onDOMEvent(domEvent);
    }
  }

  /**
   * Clear event listeners
   */
  private clearEventListeners(): void {
    this.eventListeners.forEach((listener, element) => {
      // Remove all possible event types
      ['click', 'load', 'submit', 'change', 'focus', 'blur'].forEach(
        (eventType) => {
          element.removeEventListener(eventType, listener);
        },
      );
    });
    this.eventListeners.clear();
  }

  /**
   * Get the preview container element
   */
  getContainer(): HTMLElement | undefined {
    return this.container;
  }

  /**
   * Get DOM events
   */
  getDOMEvents(): DOMEvent[] {
    return [...this.domEvents];
  }

  /**
   * Clear DOM events
   */
  clearEvents(): void {
    this.domEvents = [];
    this.setOutputValue([]);
  }

  /**
   * Event handler for DOM events
   */
  onDOMEvent?(event: DOMEvent): void;

  /**
   * Inject CSS into shadow DOM
   */
  private injectCSS(css: string): void {
    if (!this.shadowRoot) return;

    // Remove existing custom styles
    const existingStyle = this.shadowRoot.querySelector('#custom-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new styles
    const styleElement = document.createElement('style');
    styleElement.id = 'custom-styles';
    styleElement.textContent = css;
    this.shadowRoot.appendChild(styleElement);
  }

  /**
   * Execute JavaScript in shadow DOM context
   */
  private executeJS(js: string): void {
    if (!this.shadowRoot || !this.previewContainer) return;

    try {
      // Create a safe execution context
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          // Provide access to the preview container as 'document'
          const container = arguments[0];
          const shadowRoot = arguments[1];
          
          // Override document methods to work within shadow DOM
          const originalQuery = document.querySelector;
          const originalQueryAll = document.querySelectorAll;
          
          // Temporarily override document methods
          document.querySelector = function(selector) {
            return container.querySelector(selector);
          };
          document.querySelectorAll = function(selector) {
            return container.querySelectorAll(selector);
          };
          
          try {
            ${js}
          } finally {
            // Restore original methods
            document.querySelector = originalQuery;
            document.querySelectorAll = originalQueryAll;
          }
        })(arguments[0], arguments[1]);
      `;

      // Execute with context
      const func = new Function('return ' + script.textContent)();
      func.call(this.previewContainer, this.previewContainer, this.shadowRoot);
    } catch (error) {
      console.error('Error executing JavaScript in preview:', error);
    }
  }

  /**
   * Get the shadow root for external access
   */
  getShadowRoot(): ShadowRoot | undefined {
    return this.shadowRoot;
  }

  /**
   * Cleanup
   */
  onDestroy(): void {
    // Clear event listeners
    this.clearEventListeners();

    // Clean up DOM
    if (this.container) {
      this.container.remove();
    }

    // Clear events
    this.domEvents = [];
  }
}
