import { BaseComponent } from '../core/base-component';
import {
  UnifiedHeaderCSS,
  HeaderAction,
  ICONS,
  type UnifiedHeaderOptions,
} from '../core/unified-header-css';
import {
  highlightSyntax,
  type SupportedLanguage,
} from '../core/syntax-highlighter';
import { getThemeCSS, setElementTheme } from '../core/css-theme-system';

export interface CodeEditorOptions {
  language?: SupportedLanguage;
  value?: string;
  placeholder?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  tabSize?: number;
  fontSize?: string;
  fontFamily?: string;
  theme?: 'light' | 'dark';
  height?: string;
  maxHeight?: string;
  title?: string;
  showTitle?: boolean;
  showCopyButton?: boolean;
  compact?: boolean;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * CSS-Based Code Editor Component
 *
 * Features:
 * - CSS-based theming with data-theme attributes
 * - Fixed positioning with proper layering
 * - No toolbar or format functionality
 * - Clean, simplified design
 * - Copy functionality only
 */
export class CodeEditorCSS extends BaseComponent {
  private options: Required<CodeEditorOptions>;
  private unifiedHeader: UnifiedHeaderCSS;
  private headerContainer?: HTMLDivElement;
  private editorContainer!: HTMLDivElement;
  private textarea!: HTMLTextAreaElement;
  private highlightLayer!: HTMLPreElement;
  private currentValue: string;

  constructor(
    container: HTMLElement | string,
    options: CodeEditorOptions = {},
  ) {
    const defaultOptions = {
      language: options.language || ('javascript' as SupportedLanguage),
      value: options.value || '',
      placeholder: options.placeholder || 'Enter code here...',
      readOnly: options.readOnly || false,
      showLineNumbers: options.showLineNumbers || false,
      tabSize: options.tabSize || 2,
      fontSize: options.fontSize || '14px',
      fontFamily:
        options.fontFamily ||
        '"Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      theme: options.theme || ('light' as 'light' | 'dark'),
      height: options.height || '200px',
      maxHeight: options.maxHeight || 'none',
      title: options.title || '',
      showTitle: options.showTitle !== undefined ? options.showTitle : true,
      showCopyButton:
        options.showCopyButton !== undefined ? options.showCopyButton : true,
      compact: options.compact || false,
      onChange: options.onChange || (() => {}),
      onFocus: options.onFocus || (() => {}),
      onBlur: options.onBlur || (() => {}),
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.options = defaultOptions;
    this.currentValue = this.options.value;
    this.unifiedHeader = new UnifiedHeaderCSS(
      (
        tag: string,
        attrs?: Record<string, string>,
        styles?: Record<string, string>,
      ) =>
        this.createElement(tag as keyof HTMLElementTagNameMap, attrs, styles),
    );

    this.initialize();
  }

  protected initialize(): void {
    this.injectStyles(this.getStyles());
    this.createElements();
    this.setupEventListeners();
    this.updateHighlighting();
  }

  private createElements(): void {
    const root = this.getRoot();

    // Set theme on root
    setElementTheme(root, this.options.theme);

    // Main container
    const mainContainer = this.createContainer(
      'code-editor-main explorer-component explorer-container',
      {
        display: 'flex',
        flexDirection: 'column',
        height: this.options.height,
        maxHeight: this.options.maxHeight,
      },
    );

    // Header (if needed)
    if (this.shouldShowHeader()) {
      this.headerContainer = this.createHeader();
      mainContainer.appendChild(this.headerContainer);
    }

    // Editor container - this is the key fix!
    this.editorContainer = this.createContainer(
      'code-editor-container explorer-content',
      {
        position: 'relative',
        flex: '1',
        minHeight: '0',
        overflow: 'hidden',
      },
    );

    // Syntax highlighting layer - positioned behind textarea
    this.highlightLayer = this.createElement(
      'pre',
      {
        class: 'code-highlight-layer',
        'aria-hidden': 'true',
      },
      {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        margin: '0',
        padding: '12px',
        fontFamily: this.options.fontFamily,
        fontSize: this.options.fontSize,
        lineHeight: '1.5',
        color: 'transparent', // Invisible text, only highlighting shows
        backgroundColor: 'transparent',
        border: 'none',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        pointerEvents: 'none', // Don't interfere with textarea
        tabSize: this.options.tabSize.toString(),
        zIndex: '1', // Behind textarea
      },
    ) as HTMLPreElement;

    // Textarea - positioned above highlighting layer
    const textareaAttrs: Record<string, string> = {
      class: 'code-textarea explorer-textarea',
      placeholder: this.options.placeholder,
      spellcheck: 'false',
      autocomplete: 'off',
      autocorrect: 'off',
      autocapitalize: 'off',
    };

    if (this.options.readOnly) {
      textareaAttrs.readonly = 'true';
    }

    this.textarea = this.createElement('textarea', textareaAttrs, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      margin: '0',
      padding: '12px',
      fontFamily: this.options.fontFamily,
      fontSize: this.options.fontSize,
      lineHeight: '1.5',
      backgroundColor: 'transparent', // Show highlighting behind
      border: 'none',
      outline: 'none',
      resize: 'none',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      tabSize: this.options.tabSize.toString(),
      zIndex: '2', // Above highlighting layer
    }) as HTMLTextAreaElement;

    this.textarea.value = this.currentValue;

    // Add elements to container in correct order
    this.editorContainer.appendChild(this.highlightLayer);
    this.editorContainer.appendChild(this.textarea);
    mainContainer.appendChild(this.editorContainer);

    root.appendChild(mainContainer);
  }

  private shouldShowHeader(): boolean {
    return (
      (this.options.showTitle && this.options.title.length > 0) ||
      this.options.showCopyButton
    );
  }

  private createHeader(): HTMLDivElement {
    const actions: HeaderAction[] = [];

    if (this.options.showCopyButton) {
      actions.push({
        id: 'copy',
        icon: ICONS.copy,
        title: 'Copy code',
        onClick: () => this.copyToClipboard(),
        variant: 'default',
      });
    }

    const headerOptions: UnifiedHeaderOptions = {
      title: this.options.title,
      showTitle: this.options.showTitle,
      actions,
      compact: this.options.compact,
      className: 'code-editor-header',
    };

    return this.unifiedHeader.create(headerOptions);
  }

  private setupEventListeners(): void {
    // Input events
    this.textarea.addEventListener('input', () => {
      this.currentValue = this.textarea.value;
      this.updateHighlighting();
      this.options.onChange(this.currentValue);
    });

    this.textarea.addEventListener('focus', () => {
      this.options.onFocus();
    });

    this.textarea.addEventListener('blur', () => {
      this.options.onBlur();
    });

    // Tab key handling
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.insertTab();
      }
    });

    // Scroll synchronization
    this.textarea.addEventListener('scroll', () => {
      this.highlightLayer.scrollTop = this.textarea.scrollTop;
      this.highlightLayer.scrollLeft = this.textarea.scrollLeft;
    });
  }

  private updateHighlighting(): void {
    if (this.highlightLayer) {
      const result = highlightSyntax(this.currentValue, {
        language: this.options.language,
        showLineNumbers: this.options.showLineNumbers,
      });

      this.highlightLayer.innerHTML = result.highlighted;
    }
  }

  private insertTab(): void {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const spaces = ' '.repeat(this.options.tabSize);

    this.textarea.value =
      this.textarea.value.substring(0, start) +
      spaces +
      this.textarea.value.substring(end);

    this.textarea.selectionStart = this.textarea.selectionEnd =
      start + spaces.length;
    this.currentValue = this.textarea.value;
    this.updateHighlighting();
    this.options.onChange(this.currentValue);
  }

  private async copyToClipboard(): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.currentValue);
      } else {
        // Fallback for older browsers
        this.textarea.select();
        document.execCommand('copy');
      }

      // Visual feedback
      this.unifiedHeader.updateAction('copy', {
        icon: ICONS.check,
        variant: 'success',
      });

      setTimeout(() => {
        this.unifiedHeader.updateAction('copy', {
          icon: ICONS.copy,
          variant: 'default',
        });
      }, 1500);
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);

      // Show error feedback
      this.unifiedHeader.updateAction('copy', {
        icon: ICONS.warning,
        variant: 'danger',
      });

      setTimeout(() => {
        this.unifiedHeader.updateAction('copy', {
          icon: ICONS.copy,
          variant: 'default',
        });
      }, 1500);
    }
  }

  private getStyles(): string {
    return `
      ${getThemeCSS()}
      
      /* Additional code editor specific styles */
      .code-editor-container {
        /* Ensure proper stacking context */
        isolation: isolate;
      }

      .code-textarea {
        font-variant-ligatures: normal;
        font-feature-settings: "liga" 1, "calt" 1;
      }

      /* Enhanced focus states */
      .code-textarea:focus {
        box-shadow: inset 0 0 0 2px var(--explorer-border-focus);
      }
    `;
  }

  // Public API methods
  getValue(): string {
    return this.currentValue;
  }

  setValue(value: string): void {
    this.currentValue = value;
    this.textarea.value = value;
    this.updateHighlighting();
  }

  setLanguage(language: SupportedLanguage): void {
    this.options.language = language;
    this.updateHighlighting();
  }

  focus(): void {
    this.textarea.focus();
  }

  blur(): void {
    this.textarea.blur();
  }

  insertText(text: string): void {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    this.textarea.value =
      this.textarea.value.substring(0, start) +
      text +
      this.textarea.value.substring(end);

    this.textarea.selectionStart = this.textarea.selectionEnd =
      start + text.length;
    this.currentValue = this.textarea.value;
    this.updateHighlighting();
    this.options.onChange(this.currentValue);
  }

  protected onDestroy(): void {
    if (this.unifiedHeader) {
      this.unifiedHeader.destroy();
    }
  }
}
