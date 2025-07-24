import { BaseComponent } from '../core/base-component';
import {
  highlightSyntax,
  type SupportedLanguage,
} from '../core/syntax-highlighter';

export interface ResultDisplayOptions {
  value?: unknown;
  language?: SupportedLanguage;
  showBorder?: boolean;
  height?: string;
  maxHeight?: string;
  theme?: 'light' | 'dark';
  expandable?: boolean;
  maxExpandedItems?: number;
  onCopy?: () => void;
}

/**
 * Smart result display component for JSON/object visualization
 * Handles various data types with syntax highlighting and expansion
 */
export class ResultDisplay extends BaseComponent {
  private options: Required<ResultDisplayOptions>;
  private displayContainer!: HTMLDivElement;
  private contentContainer!: HTMLDivElement;
  private currentValue: unknown = undefined;

  constructor(
    container: HTMLElement | string,
    options: ResultDisplayOptions = {},
  ) {
    const defaultOptions = {
      value: options.value,
      language: options.language || ('json' as SupportedLanguage),
      showBorder: options.showBorder !== undefined ? options.showBorder : true,
      height: options.height || '200px',
      maxHeight: options.maxHeight || 'none',
      theme: options.theme || ('light' as 'light' | 'dark'),
      expandable: options.expandable !== undefined ? options.expandable : true,
      maxExpandedItems: options.maxExpandedItems || 100,
      onCopy: options.onCopy || (() => {}),
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.options = defaultOptions;
    this.currentValue = this.options.value;

    this.initialize();
  }

  protected initialize(): void {
    this.injectStyles(this.getStyles());
    this.createElements();
    this.updateDisplay();
  }

  private createElements(): void {
    const root = this.getRoot();

    // Main container
    this.displayContainer = this.createContainer('result-display-container', {
      border: this.options.showBorder ? '1px solid #d1d5db' : 'none',
      borderRadius: '6px',
      backgroundColor: this.options.theme === 'dark' ? '#1f2937' : '#ffffff',
      height: this.options.height,
      maxHeight: this.options.maxHeight,
      overflow: 'auto',
      position: 'relative',
    });

    // Content container
    this.contentContainer = this.createContainer('result-display-content', {
      padding: '12px',
      fontFamily:
        '"Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: '14px',
      lineHeight: '1.5',
      color: this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937',
    });

    this.displayContainer.appendChild(this.contentContainer);
    root.appendChild(this.displayContainer);
  }

  private updateDisplay(): void {
    if (!this.contentContainer) return;

    this.contentContainer.innerHTML = '';

    if (this.currentValue === undefined || this.currentValue === null) {
      this.showEmptyState();
      return;
    }

    try {
      const displayContent = this.formatValue(this.currentValue);

      if (
        this.isObject(this.currentValue) ||
        Array.isArray(this.currentValue)
      ) {
        this.renderStructuredData(displayContent);
      } else {
        this.renderSimpleValue(displayContent);
      }
    } catch (error) {
      this.showError('Failed to display result: ' + String(error));
    }
  }

  private formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Error) {
      return `Error: ${value.message}`;
    }

    if (typeof value === 'function') {
      return value.toString();
    }

    // For objects and arrays, stringify with pretty formatting
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private renderStructuredData(content: string): void {
    try {
      // Use syntax highlighting for JSON-like content
      const highlighted = highlightSyntax(content, {
        language: this.options.language,
        showLineNumbers: false,
      });

      const preElement = this.createElement(
        'pre',
        { class: 'result-display-code' },
        {
          margin: '0',
          padding: '0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'visible',
        },
      );

      preElement.innerHTML = highlighted.highlighted;
      this.contentContainer.appendChild(preElement);

      // Add copy functionality
      this.addCopyButton();

      // Add expandable functionality if needed
      if (this.options.expandable) {
        this.makeExpandable(preElement);
      }
    } catch (error) {
      this.renderSimpleValue(content);
    }
  }

  private renderSimpleValue(content: string): void {
    const valueElement = this.createElement(
      'div',
      { class: 'result-display-simple' },
      {
        padding: '4px 0',
        wordBreak: 'break-word',
      },
    );

    // Apply basic styling based on value type
    if (this.currentValue === null) {
      valueElement.style.color = '#9ca3af';
      valueElement.style.fontStyle = 'italic';
    } else if (typeof this.currentValue === 'string') {
      valueElement.style.color =
        this.options.theme === 'dark' ? '#10b981' : '#059669';
    } else if (typeof this.currentValue === 'number') {
      valueElement.style.color =
        this.options.theme === 'dark' ? '#f59e0b' : '#d97706';
    } else if (typeof this.currentValue === 'boolean') {
      valueElement.style.color =
        this.options.theme === 'dark' ? '#8b5cf6' : '#7c3aed';
    }

    valueElement.textContent = content;
    this.contentContainer.appendChild(valueElement);

    this.addCopyButton();
  }

  private addCopyButton(): void {
    const copyButton = this.createElement(
      'button',
      { class: 'result-display-copy', type: 'button' },
      {
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '4px 8px',
        fontSize: '12px',
        fontWeight: '500',
        color: this.options.theme === 'dark' ? '#d1d5db' : '#374151',
        backgroundColor: this.options.theme === 'dark' ? '#374151' : '#f9fafb',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        cursor: 'pointer',
        opacity: '0.7',
        transition: 'all 0.2s ease',
      },
    );

    copyButton.textContent = 'Copy';

    this.addEventListener(copyButton, 'click', () => {
      this.copyResult();
    });

    this.addEventListener(copyButton, 'mouseenter', () => {
      copyButton.style.opacity = '1';
    });

    this.addEventListener(copyButton, 'mouseleave', () => {
      copyButton.style.opacity = '0.7';
    });

    this.displayContainer.appendChild(copyButton);
  }

  private makeExpandable(element: HTMLPreElement): void {
    // Find long arrays or objects and make them collapsible
    const lines = element.innerHTML.split('\n');

    if (lines.length > 10) {
      let isCollapsed = true;
      const maxVisible = 5;

      const toggleButton = this.createElement(
        'button',
        { class: 'result-display-expand', type: 'button' },
        {
          display: 'block',
          margin: '8px 0',
          padding: '4px 8px',
          fontSize: '12px',
          color: this.options.theme === 'dark' ? '#60a5fa' : '#3b82f6',
          backgroundColor: 'transparent',
          border: '1px solid',
          borderColor: this.options.theme === 'dark' ? '#60a5fa' : '#3b82f6',
          borderRadius: '4px',
          cursor: 'pointer',
        },
      );

      const updateView = () => {
        if (isCollapsed) {
          const visibleLines = lines.slice(0, maxVisible).join('\n');
          const hiddenCount = lines.length - maxVisible;
          element.innerHTML =
            visibleLines + `\n  ... ${hiddenCount} more lines`;
          toggleButton.textContent = `Show ${hiddenCount} more lines`;
        } else {
          element.innerHTML = lines.join('\n');
          toggleButton.textContent = 'Collapse';
        }
      };

      this.addEventListener(toggleButton, 'click', () => {
        isCollapsed = !isCollapsed;
        updateView();
      });

      updateView();
      this.contentContainer.appendChild(toggleButton);
    }
  }

  private async copyResult(): Promise<void> {
    try {
      const textToCopy = this.formatValue(this.currentValue);
      await navigator.clipboard.writeText(textToCopy);

      const copyButton = this.displayContainer.querySelector(
        '.result-display-copy',
      ) as HTMLButtonElement;
      if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        copyButton.style.color = '#059669';

        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.color =
            this.options.theme === 'dark' ? '#d1d5db' : '#374151';
        }, 2000);
      }

      this.options.onCopy();
    } catch (error) {
      console.error('Failed to copy result:', error);
    }
  }

  private showEmptyState(): void {
    const emptyState = this.createElement(
      'div',
      { class: 'result-display-empty' },
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px',
        color: '#6b7280',
        fontSize: '14px',
        fontStyle: 'italic',
        fontFamily:
          '"Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      },
    );
    emptyState.textContent = 'No result yet.';
    this.contentContainer.appendChild(emptyState);
  }

  private showError(message: string): void {
    const errorState = this.createElement(
      'div',
      { class: 'result-display-error' },
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px',
        color: '#dc2626',
        fontSize: '14px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '4px',
        padding: '12px',
        margin: '12px',
      },
    );
    errorState.textContent = message;
    this.contentContainer.appendChild(errorState);
  }

  private getStyles(): string {
    return `
      .result-display-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }

      .result-display-content {
        box-sizing: border-box;
      }

      .result-display-code {
        position: relative;
      }

      .result-display-copy:hover {
        background-color: ${this.options.theme === 'dark' ? '#4b5563' : '#f3f4f6'};
      }

      .result-display-expand:hover {
        background-color: ${this.options.theme === 'dark' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
      }

      /* Syntax highlighting for values */
      .result-display-simple {
        font-family: '"Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace';
      }

      /* Scrollbar styling */
      .result-display-container::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .result-display-container::-webkit-scrollbar-track {
        background: ${this.options.theme === 'dark' ? '#374151' : '#f1f5f9'};
        border-radius: 4px;
      }

      .result-display-container::-webkit-scrollbar-thumb {
        background: ${this.options.theme === 'dark' ? '#6b7280' : '#cbd5e1'};
        border-radius: 4px;
      }

      .result-display-container::-webkit-scrollbar-thumb:hover {
        background: ${this.options.theme === 'dark' ? '#9ca3af' : '#94a3b8'};
      }
    `;
  }

  // Public API methods

  getValue(): unknown {
    return this.currentValue;
  }

  setValue(value: unknown): void {
    this.currentValue = value;
    this.updateDisplay();
  }

  setLanguage(language: SupportedLanguage): void {
    this.options.language = language;
    this.updateDisplay();
  }

  clear(): void {
    this.currentValue = undefined;
    this.updateDisplay();
  }

  getFormattedValue(): string {
    return this.formatValue(this.currentValue);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.options.theme = theme;
    this.injectStyles(this.getStyles());
    this.updateDisplay();
  }
}
