import { BaseComponent } from '../core/base-component';
import {
  highlightSyntax,
  type SupportedLanguage,
} from '../core/syntax-highlighter';
import { getThemeCSS, setElementTheme } from '../core/css-theme-system';

export interface ResultDisplayOptions {
  value?: unknown;
  language?: SupportedLanguage;
  showBorder?: boolean;
  height?: string;
  maxHeight?: string;
  theme?: 'light' | 'dark';
  expandable?: boolean;
  maxExpandedItems?: number;
}

/**
 * CSS-Based Result Display Component
 *
 * Simplified result display without copy functionality.
 * Uses CSS theming with data-theme attributes.
 */
export class ResultDisplayCSS extends BaseComponent {
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

    // Set theme on root
    setElementTheme(root, this.options.theme);

    // Main display container
    const containerStyles: Record<string, string> = {
      height: this.options.height,
      maxHeight: this.options.maxHeight,
      overflow: 'auto',
    };

    if (!this.options.showBorder) {
      containerStyles.border = 'none';
    }

    this.displayContainer = this.createContainer(
      'result-display-main explorer-component explorer-container',
      containerStyles,
    );

    // Content container
    this.contentContainer = this.createElement(
      'div',
      {
        class: 'result-display-content explorer-content',
      },
      {
        padding: '12px',
        fontFamily:
          '"Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
        fontSize: '13px',
        lineHeight: '1.4',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      },
    ) as HTMLDivElement;

    this.displayContainer.appendChild(this.contentContainer);
    root.appendChild(this.displayContainer);
  }

  private updateDisplay(): void {
    if (!this.contentContainer) return;

    try {
      const formatted = this.formatValue(this.currentValue);

      if (this.isJsonLike(formatted)) {
        // Apply syntax highlighting for JSON-like content
        const result = highlightSyntax(formatted, {
          language: 'json',
          showLineNumbers: false,
        });
        this.contentContainer.innerHTML = result.highlighted;
      } else {
        // Plain text display
        this.contentContainer.textContent = formatted;
      }
    } catch (error) {
      // Error display
      this.contentContainer.innerHTML = `
        <div class="result-error">
          <strong>Display Error:</strong> ${error instanceof Error ? error.message : String(error)}
        </div>
      `;
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
      return `Error: ${value.message}${value.stack ? '\n\nStack trace:\n' + value.stack : ''}`;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, this.jsonReplacer, 2);
      } catch (error) {
        // Handle circular references and other JSON errors
        return this.fallbackStringify(value);
      }
    }

    return String(value);
  }

  private jsonReplacer(key: string, value: unknown): unknown {
    // Handle functions
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    // Handle undefined
    if (value === undefined) {
      return '[undefined]';
    }

    // Handle symbols
    if (typeof value === 'symbol') {
      return `[Symbol: ${value.toString()}]`;
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return `[BigInt: ${value.toString()}]`;
    }

    return value;
  }

  private fallbackStringify(value: unknown): string {
    try {
      // Try to create a readable representation
      if (Array.isArray(value)) {
        const items = value
          .slice(0, this.options.maxExpandedItems)
          .map((item) =>
            typeof item === 'object' ? '[Object]' : String(item),
          );
        const truncated =
          value.length > this.options.maxExpandedItems ? '...' : '';
        return `[\n  ${items.join(',\n  ')}${truncated}\n]`;
      }

      if (value && typeof value === 'object') {
        const entries = Object.entries(value).slice(
          0,
          this.options.maxExpandedItems,
        );
        const lines = entries.map(
          ([k, v]) =>
            `  "${k}": ${typeof v === 'object' ? '[Object]' : JSON.stringify(v)}`,
        );
        const truncated =
          Object.keys(value).length > this.options.maxExpandedItems
            ? '  ...'
            : '';
        return `{\n${lines.join(',\n')}${truncated ? '\n' + truncated : ''}\n}`;
      }

      return String(value);
    } catch (error) {
      return `[Unable to display: ${error instanceof Error ? error.message : 'unknown error'}]`;
    }
  }

  private isJsonLike(str: string): boolean {
    const trimmed = str.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      trimmed === 'null' ||
      trimmed === 'true' ||
      trimmed === 'false' ||
      /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)
    );
  }

  private getStyles(): string {
    return `
      ${getThemeCSS()}
      
      /* Result display specific styles */
      .result-display-content {
        /* Ensure proper text rendering */
        font-variant-ligatures: normal;
        font-feature-settings: "liga" 1, "calt" 1;
      }

      /* Error display styles */
      .result-error {
        color: var(--explorer-danger);
        background-color: var(--explorer-bg-secondary);
        padding: 8px;
        border-radius: 4px;
        border-left: 4px solid var(--explorer-danger);
      }

      .result-error strong {
        display: block;
        margin-bottom: 4px;
      }

      /* Enhanced scrolling for long content */
      .result-display-main {
        scrollbar-width: thin;
      }
    `;
  }

  // Public API methods
  setValue(value: unknown): void {
    this.currentValue = value;
    this.updateDisplay();
  }

  getValue(): unknown {
    return this.currentValue;
  }

  setLanguage(language: SupportedLanguage): void {
    this.options.language = language;
    this.updateDisplay();
  }

  clear(): void {
    this.setValue(undefined);
  }

  protected onDestroy(): void {
    // No special cleanup needed
  }
}
