/**
 * ResultDisplay Component - Display execution results, logs, and errors
 *
 * Features:
 * - Multiple result types (value, error, log)
 * - JSON formatting and syntax highlighting
 * - Collapsible sections
 * - Copy functionality
 * - Theme-aware styling
 * - Functional factory pattern
 */

import { createComponent, type ComponentAPI } from '../core/Component';
import { highlightSyntax } from '../utils/syntax';
import {
  createElement,
  addEventListener,
  copyToClipboard,
  injectCSS,
  injectComponentCSS,
} from '../utils/dom';

export type ResultType = 'value' | 'error' | 'log' | 'warning' | 'info';

export interface ResultItem {
  type: ResultType;
  content: unknown;
  timestamp?: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ResultDisplayOptions {
  maxResults?: number;
  showTimestamps?: boolean;
  showCopyButton?: boolean;
  collapsible?: boolean;
  autoScroll?: boolean;
  height?: string;
  onCopy?: (content: string) => void;
  onClear?: () => void;
}

export interface ResultDisplayAPI extends ComponentAPI {
  addResult(result: ResultItem): void;
  addValue(value: unknown, label?: string): void;
  addError(error: Error | string, label?: string): void;
  addLog(message: string, label?: string): void;
  addWarning(message: string, label?: string): void;
  addInfo(message: string, label?: string): void;
  clear(): void;
  getResults(): ResultItem[];
  setResults(results: ResultItem[]): void;
}

/**
 * Create a ResultDisplay component
 */
export function createResultDisplay(
  elementOrSelector: HTMLElement | string,
  options: ResultDisplayOptions = {},
): ResultDisplayAPI {
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
    useShadowDOM: true, // Enable shadow DOM for CSS isolation
  });

  const element = baseComponent.getElement()!;
  const shadowRoot = baseComponent.getShadowRoot();
  const contentRoot = baseComponent.getContentRoot() as HTMLElement;

  // Add class to both host and content root for backward compatibility
  element.classList.add('explorer-result-display');
  contentRoot.classList.add('explorer-result-display');

  // Component state
  let results: ResultItem[] = [];
  let contentContainer: HTMLElement;

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  /**
   * Inject ResultDisplay CSS styles
   */
  function injectStyles(): void {
    // Detect theme from host document
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Define theme-aware colors
    const colors = {
      bgPrimary: isDark ? '#1e1e1e' : '#ffffff',
      bgSecondary: isDark ? '#2d2d2d' : '#f8f9fa',
      bgTertiary: isDark ? '#404040' : '#f1f3f4',
      borderPrimary: isDark ? '#404040' : '#e1e5e9',
      textPrimary: isDark ? '#e1e4e8' : '#24292e',
      textSecondary: isDark ? '#c9d1d9' : '#586069',
      textMuted: isDark ? '#8b949e' : '#6a737d',
      textInverse: '#ffffff',
      interactivePrimary: '#2563eb',
      interactiveHover: isDark ? '#30363d' : '#f3f4f6',
      interactiveError: '#ef4444',
      interactiveWarning: '#f59e0b',
    };

    const css = `
/* CSS Reset and theme setup for shadow DOM */
:host {
  display: block;
  width: 100%;
  height: 100%;
}
/* ResultDisplay Component Styles */
.explorer-result-display {
  background: ${colors.bgPrimary};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.explorer-result-display * {
  box-sizing: border-box;
}

.explorer-result-display__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.explorer-result-display__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: ${colors.textMuted};
  font-style: italic;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.explorer-result-item__content {
  color: ${colors.textPrimary};
  word-break: break-word;
  padding: 0;
  margin: 0;
}

.explorer-result-item__content pre {
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: inherit;
  white-space: pre-wrap;
}

.explorer-result-item__content--json {
  background: ${colors.bgTertiary};
  padding: 8px;
  border-radius: 4px;
  margin-top: 4px;
}

.explorer-result-item__content--error {
  color: ${colors.interactiveError};
}

.explorer-result-item__content--collapsed {
  max-height: 100px;
  overflow: hidden;
  position: relative;
}

.explorer-result-item__content--collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(transparent, ${colors.bgSecondary});
}

.explorer-result-item__expand-btn {
  background: none;
  border: none;
  color: ${colors.interactivePrimary};
  cursor: pointer;
  font-size: 11px;
  margin-top: 4px;
  text-decoration: underline;
}

/* Syntax highlighting integration - theme aware */
.explorer-result-display .syntax-keyword { color: ${isDark ? '#ff6b6b' : '#d73a49'}; font-weight: 600; }
.explorer-result-display .syntax-string { color: ${isDark ? '#4ecdc4' : '#032f62'}; }
.explorer-result-display .syntax-number { color: ${isDark ? '#45b7d1' : '#005cc5'}; }
.explorer-result-display .syntax-boolean { color: ${isDark ? '#ff6b6b' : '#d73a49'}; }
.explorer-result-display .syntax-null { color: ${isDark ? '#ff6b6b' : '#d73a49'}; }
.explorer-result-display .syntax-key { color: ${isDark ? '#9b59b6' : '#6f42c1'}; }

/* Responsive design */
@media (max-width: 768px) {
  .explorer-result-display__content {
    font-size: 12px;
    padding: 6px;
  }
  
  .explorer-result-item {
    padding: 6px;
    margin-bottom: 8px;
  }
}
`;

    injectComponentCSS(css, 'explorer-result-display-styles', shadowRoot);
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): void {
    contentRoot.innerHTML = '';

    // Create content container
    contentContainer = createElement('div', {
      className: 'explorer-result-display__content',
    });

    // Set height
    if (options.height) {
      contentContainer.style.height = options.height;
    } else {
      contentContainer.style.minHeight = '150px';
      contentContainer.style.maxHeight = '400px';
    }

    contentRoot.appendChild(contentContainer);

    // Show empty state
    updateDisplay();
  }

  /**
   * Format content for display
   */
  function formatContent(content: unknown): { html: string; isJSON: boolean } {
    if (content === null) {
      return { html: '<span class="syntax-null">null</span>', isJSON: false };
    }

    if (content === undefined) {
      return {
        html: '<span class="syntax-null">undefined</span>',
        isJSON: false,
      };
    }

    if (typeof content === 'string') {
      return { html: `"${content}"`, isJSON: false };
    }

    if (typeof content === 'number') {
      return {
        html: `<span class="syntax-number">${content}</span>`,
        isJSON: false,
      };
    }

    if (typeof content === 'boolean') {
      return {
        html: `<span class="syntax-boolean">${content}</span>`,
        isJSON: false,
      };
    }

    if (typeof content === 'function') {
      return { html: '[Function]', isJSON: false };
    }

    if (content instanceof Error) {
      return { html: `${content.name}: ${content.message}`, isJSON: false };
    }

    // For objects and arrays, format as JSON
    try {
      const json = JSON.stringify(content, null, 2);
      const highlighted = highlightSyntax(json, 'json');
      return { html: highlighted, isJSON: true };
    } catch {
      return { html: String(content), isJSON: false };
    }
  }

  /**
   * Format timestamp
   */
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  /**
   * Create result item element
   */
  function createResultItem(result: ResultItem, index: number): HTMLElement {
    // Content
    const { html, isJSON } = formatContent(result.content);
    const content = createElement('div', {
      className: `explorer-result-item__content ${isJSON ? 'explorer-result-item__content--json' : ''} ${result.type === 'error' ? 'explorer-result-item__content--error' : ''}`,
    });

    if (isJSON) {
      content.innerHTML = `<pre>${html}</pre>`;
    } else {
      content.innerHTML = html;
    }

    // Add collapsible functionality for long content
    if (options.collapsible && content.scrollHeight > 120) {
      content.classList.add('explorer-result-item__content--collapsed');

      const expandBtn = createElement('button', {
        className: 'explorer-result-item__expand-btn',
        textContent: 'Show more',
      }) as HTMLButtonElement;

      const onExpand = () => {
        content.classList.remove('explorer-result-item__content--collapsed');
        expandBtn.remove();
      };

      cleanupFunctions.push(addEventListener(expandBtn, 'click', onExpand));
      content.appendChild(expandBtn);
    }

    return content;
  }

  /**
   * Update the display
   */
  function updateDisplay(): void {
    contentContainer.innerHTML = '';

    if (results.length === 0) {
      const empty = createElement('div', {
        className: 'explorer-result-display__empty',
        textContent: 'No results yet',
      });
      contentContainer.appendChild(empty);
      return;
    }

    results.forEach((result, index) => {
      const item = createResultItem(result, index);
      contentContainer.appendChild(item);

      // Add spacing between items
      if (index < results.length - 1) {
        const spacer = createElement('div', {
          style: 'margin-bottom: 12px;',
        });
        contentContainer.appendChild(spacer);
      }
    });

    // Auto-scroll to bottom
    if (options.autoScroll !== false) {
      contentContainer.scrollTop = contentContainer.scrollHeight;
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners(): void {
    // No event listeners needed in this component
  }

  // Enhanced API
  const api: ResultDisplayAPI = {
    ...baseComponent,

    addResult(result: ResultItem): void {
      const newResult = {
        ...result,
        timestamp: result.timestamp || Date.now(),
      };

      results.push(newResult);

      // Limit results if specified
      if (options.maxResults && results.length > options.maxResults) {
        results = results.slice(-options.maxResults);
      }

      updateDisplay();
    },

    addValue(value: unknown, label?: string): void {
      this.addResult({ type: 'value', content: value, label });
    },

    addError(error: Error | string, label?: string): void {
      const content = error instanceof Error ? error : new Error(error);
      this.addResult({ type: 'error', content, label });
    },

    addLog(message: string, label?: string): void {
      this.addResult({ type: 'log', content: message, label });
    },

    addWarning(message: string, label?: string): void {
      this.addResult({ type: 'warning', content: message, label });
    },

    addInfo(message: string, label?: string): void {
      this.addResult({ type: 'info', content: message, label });
    },

    clear(): void {
      results = [];
      updateDisplay();
    },

    getResults(): ResultItem[] {
      return [...results];
    },

    setResults(newResults: ResultItem[]): void {
      results = [...newResults];
      updateDisplay();
    },

    destroy(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      baseComponent.destroy();
    },
  };

  // Initialize component
  injectStyles();
  createDOM();
  setupEventListeners();

  // Mount the base component
  api.mount();

  return api;
}
