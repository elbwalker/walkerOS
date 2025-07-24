import { BaseComponent } from '../core/base-component';
import {
  highlightSyntax,
  DEFAULT_SYNTAX_CSS,
  type SupportedLanguage,
  type HighlightOptions,
} from '../core/syntax-highlighter';

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
  showCopyButton?: boolean;
  showFormatButton?: boolean;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Vanilla JS code editor with syntax highlighting
 */
export class CodeEditor extends BaseComponent {
  private options: Required<CodeEditorOptions>;
  private textarea!: HTMLTextAreaElement;
  private highlightContainer!: HTMLPreElement;
  private toolbar?: HTMLDivElement;
  private copyButton?: HTMLButtonElement;
  private formatButton?: HTMLButtonElement;
  private currentValue = '';

  constructor(
    container: HTMLElement | string,
    options: CodeEditorOptions = {},
  ) {
    // Set default options first
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
      showCopyButton:
        options.showCopyButton !== undefined ? options.showCopyButton : true,
      showFormatButton: options.showFormatButton || false,
      onChange: options.onChange || (() => {}),
      onFocus: options.onFocus || (() => {}),
      onBlur: options.onBlur || (() => {}),
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.options = defaultOptions;
    this.currentValue = this.options.value;

    // Initialize after options are set
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

    // Main container
    const mainContainer = this.createContainer('code-editor-container', {
      position: 'relative',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: this.options.theme === 'dark' ? '#1f2937' : '#ffffff',
      overflow: 'hidden',
    });

    // Toolbar
    if (this.options.showCopyButton || this.options.showFormatButton) {
      this.toolbar = this.createToolbar();
      mainContainer.appendChild(this.toolbar);
    }

    // Editor container
    const editorContainer = this.createContainer('code-editor-editor', {
      position: 'relative',
      height: this.options.height,
      maxHeight: this.options.maxHeight,
      overflow: 'hidden',
    });

    // Syntax highlighting container
    this.highlightContainer = this.createElement(
      'pre',
      { class: 'code-editor-highlight' },
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
        color: 'transparent',
        backgroundColor: 'transparent',
        border: 'none',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        pointerEvents: 'none',
        tabSize: this.options.tabSize.toString(),
      },
    );

    // Textarea for input
    const textareaAttrs: Record<string, string> = {
      class: 'code-editor-textarea',
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
      color: this.options.theme === 'dark' ? '#f3f4f6' : '#1f2937',
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      tabSize: this.options.tabSize.toString(),
    });

    this.textarea.value = this.currentValue;

    editorContainer.appendChild(this.highlightContainer);
    editorContainer.appendChild(this.textarea);
    mainContainer.appendChild(editorContainer);

    root.appendChild(mainContainer);
  }

  private createToolbar(): HTMLDivElement {
    const toolbar = this.createContainer('code-editor-toolbar', {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: this.options.theme === 'dark' ? '#374151' : '#f9fafb',
    });

    if (this.options.showCopyButton) {
      this.copyButton = this.createElement(
        'button',
        { class: 'code-editor-copy-btn', type: 'button' },
        {
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: '500',
          color: this.options.theme === 'dark' ? '#d1d5db' : '#374151',
          backgroundColor: 'transparent',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
      );
      this.copyButton.textContent = 'Copy';
      toolbar.appendChild(this.copyButton);
    }

    if (this.options.showFormatButton) {
      this.formatButton = this.createElement(
        'button',
        { class: 'code-editor-format-btn', type: 'button' },
        {
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: '500',
          color: this.options.theme === 'dark' ? '#d1d5db' : '#374151',
          backgroundColor: 'transparent',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
      );
      this.formatButton.textContent = 'Format';
      toolbar.appendChild(this.formatButton);
    }

    return toolbar;
  }

  private setupEventListeners(): void {
    // Textarea input event
    this.addEventListener(this.textarea, 'input', () => {
      this.currentValue = this.textarea.value;
      this.updateHighlighting();
      this.options.onChange(this.currentValue);
    });

    // Focus and blur events
    this.addEventListener(this.textarea, 'focus', () => {
      this.options.onFocus();
    });

    this.addEventListener(this.textarea, 'blur', () => {
      this.options.onBlur();
    });

    // Tab key handling
    this.addEventListener(this.textarea, 'keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
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
    });

    // Scroll synchronization
    this.addEventListener(this.textarea, 'scroll', () => {
      this.highlightContainer.scrollTop = this.textarea.scrollTop;
      this.highlightContainer.scrollLeft = this.textarea.scrollLeft;
    });

    // Copy button
    if (this.copyButton) {
      this.addEventListener(this.copyButton, 'click', () => {
        this.copyToClipboard();
      });
    }

    // Format button
    if (this.formatButton) {
      this.addEventListener(this.formatButton, 'click', () => {
        this.formatCode();
      });
    }
  }

  private updateHighlighting(): void {
    const highlightOptions: HighlightOptions = {
      language: this.options.language,
      showLineNumbers: this.options.showLineNumbers,
      tabSize: this.options.tabSize,
    };

    const result = highlightSyntax(this.currentValue, highlightOptions);
    this.highlightContainer.innerHTML = result.highlighted;
  }

  private async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.currentValue);
      if (this.copyButton) {
        const originalText = this.copyButton.textContent;
        this.copyButton.textContent = 'Copied!';
        this.copyButton.style.color = '#059669';

        setTimeout(() => {
          if (this.copyButton) {
            this.copyButton.textContent = originalText;
            this.copyButton.style.color =
              this.options.theme === 'dark' ? '#d1d5db' : '#374151';
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  private formatCode(): void {
    try {
      if (this.options.language === 'json') {
        const parsed = JSON.parse(this.currentValue);
        const formatted = JSON.stringify(parsed, null, this.options.tabSize);
        this.setValue(formatted);
      }
      // Add more formatting logic for other languages as needed
    } catch (err) {
      console.error('Failed to format code:', err);
    }
  }

  private getStyles(): string {
    return `
      ${DEFAULT_SYNTAX_CSS}
      
      .code-editor-container {
        font-family: ${this.options.fontFamily};
      }
      
      .code-editor-copy-btn:hover,
      .code-editor-format-btn:hover {
        background-color: ${this.options.theme === 'dark' ? '#4b5563' : '#f3f4f6'};
      }
      
      .code-editor-textarea::placeholder {
        color: ${this.options.theme === 'dark' ? '#9ca3af' : '#6b7280'};
      }
      
      .code-editor-textarea:focus + .code-editor-highlight,
      .code-editor-textarea:focus {
        outline: 2px solid #3b82f6;
        outline-offset: -2px;
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

  focus(): void {
    this.textarea.focus();
  }

  blur(): void {
    this.textarea.blur();
  }

  setLanguage(language: SupportedLanguage): void {
    this.options.language = language;
    this.updateHighlighting();
  }

  setReadOnly(readOnly: boolean): void {
    this.options.readOnly = readOnly;
    this.textarea.readOnly = readOnly;
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
}
