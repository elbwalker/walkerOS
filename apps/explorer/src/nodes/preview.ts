/**
 * Preview Node
 * Renders HTML in shadow DOM with real walkerOS browser source integration
 */

import { BaseNode } from './base';
import type {
  GraphNode,
  NodeConfig,
  DOMEvent,
  CodeContent,
} from '../graph/types';
import type { WalkerOS } from '@walkeros/core';
import { createShadow } from '../lib/dom';

export class PreviewNode extends BaseNode<
  string | CodeContent,
  WalkerOS.Event[]
> {
  private container?: HTMLElement;
  private shadowRoot?: ShadowRoot;
  private previewContainer?: HTMLElement;
  private walkerEvents: WalkerOS.Event[] = [];

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
          id: 'events',
          type: 'output',
          dataType: 'events',
          label: 'Walker Events',
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

  async process(input: string | CodeContent): Promise<WalkerOS.Event[]> {
    // Clear previous events
    this.walkerEvents = [];

    // Extract content from input
    const content = this.extractContent(input);

    // Render HTML, CSS, and JS in shadow DOM
    await this.renderContent(content);

    // Return walker events (will be populated externally)
    return this.walkerEvents;
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

  // Simplified PreviewNode - browser source now handled by playground

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
   * Get the preview container for browser source integration
   */
  getPreviewContainer(): HTMLElement | undefined {
    return this.previewContainer;
  }

  /**
   * Get the preview container element
   */
  getContainer(): HTMLElement | undefined {
    return this.container;
  }

  /**
   * Event handler for DOM events (legacy)
   */
  onDOMEvent?(event: DOMEvent): void;

  /**
   * Event handler for Walker events (real integration)
   */
  onWalkerEvent?(event: WalkerOS.Event): void;

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
      const scriptContent = script.textContent;
      if (scriptContent) {
        const func = new Function('container', 'shadowRoot', scriptContent);
        func.call(
          this.previewContainer,
          this.previewContainer,
          this.shadowRoot,
        );
      }
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
    try {
      // Clear the shadow DOM content to release references
      if (this.shadowRoot && this.previewContainer) {
        this.previewContainer.innerHTML = '';
      }

      // Remove container from DOM
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }

      // Clear all references
      this.walkerEvents = [];
      this.container = undefined;
      this.shadowRoot = undefined;
      this.previewContainer = undefined;
      this.onDOMEvent = undefined;
      this.onWalkerEvent = undefined;
    } catch (error) {
      console.warn(`Error during PreviewNode cleanup:`, error);
    }
  }
}
