import { BaseComponent } from '../core/base-component';
import { CodeEditorCSS, type CodeEditorOptions } from './code-editor-css';
import {
  ResultDisplayCSS,
  type ResultDisplayOptions,
} from './result-display-css';
import {
  UnifiedHeaderCSS,
  HeaderAction,
  ICONS,
  type UnifiedHeaderOptions,
} from '../core/unified-header-css';
import { type SupportedLanguage } from '../core/syntax-highlighter';
import { getThemeCSS, setElementTheme } from '../core/css-theme-system';

export interface LiveCodeCSSOptions {
  // Editor configuration
  initialCode?: string;
  language?: SupportedLanguage;
  editorHeight?: string;
  resultHeight?: string;
  placeholder?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  tabSize?: number;
  fontSize?: string;
  fontFamily?: string;

  // Display configuration
  theme?: 'light' | 'dark';
  title?: string;
  showTitle?: boolean;
  showRunButton?: boolean;
  showResetButton?: boolean;
  autoRun?: boolean;
  debounceMs?: number;

  // Layout
  layout?: 'horizontal' | 'vertical';
  compact?: boolean;
  className?: string;

  // Callbacks
  onRun?: (code: string) => Promise<unknown> | unknown;
  onCodeChange?: () => void;
  onReset?: () => void;
}

/**
 * CSS-Based LiveCode Component
 *
 * Interactive code editor with live result display.
 * Uses CSS theming with data-theme attributes.
 * No toolbar or format functionality.
 */
export class LiveCodeCSS extends BaseComponent {
  private options: Required<LiveCodeCSSOptions>;
  private unifiedHeader: UnifiedHeaderCSS;
  private headerContainer?: HTMLDivElement;
  private contentContainer!: HTMLDivElement;
  private codeEditor!: CodeEditorCSS;
  private resultDisplay!: ResultDisplayCSS;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor(
    container: HTMLElement | string,
    options: LiveCodeCSSOptions = {},
  ) {
    const defaultOptions = {
      // Editor configuration
      initialCode: options.initialCode || '',
      language: options.language || ('javascript' as SupportedLanguage),
      editorHeight: options.editorHeight || '200px',
      resultHeight: options.resultHeight || '200px',
      placeholder: options.placeholder || 'Enter code here...',
      readOnly: options.readOnly || false,
      showLineNumbers: options.showLineNumbers || false,
      tabSize: options.tabSize || 2,
      fontSize: options.fontSize || '14px',
      fontFamily:
        options.fontFamily ||
        '"Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',

      // Display configuration
      theme: options.theme || ('light' as 'light' | 'dark'),
      title: options.title || '',
      showTitle: options.showTitle !== undefined ? options.showTitle : true,
      showRunButton:
        options.showRunButton !== undefined ? options.showRunButton : true,
      showResetButton:
        options.showResetButton !== undefined ? options.showResetButton : false,
      autoRun: options.autoRun !== undefined ? options.autoRun : false,
      debounceMs: options.debounceMs || 500,

      // Layout
      layout: options.layout || ('vertical' as 'horizontal' | 'vertical'),
      compact: options.compact || false,
      className: options.className || '',

      // Callbacks
      onRun: options.onRun || ((code: string) => Promise.resolve(code)),
      onCodeChange: options.onCodeChange || (() => {}),
      onReset: options.onReset || (() => {}),
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.options = defaultOptions;
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

    // Auto-run on initialization if enabled
    if (this.options.autoRun && this.options.initialCode) {
      this.runCode();
    }
  }

  private createElements(): void {
    const root = this.getRoot();

    // Set theme on root
    setElementTheme(root, this.options.theme);

    // Main container
    const mainContainer = this.createContainer(
      'live-code-main explorer-component explorer-container',
      {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      },
    );

    // Add custom class name if provided
    if (this.options.className) {
      mainContainer.classList.add(this.options.className);
    }

    // Header (if needed)
    if (this.shouldShowHeader()) {
      this.headerContainer = this.createHeader();
      mainContainer.appendChild(this.headerContainer);
    }

    // Content container with layout
    this.contentContainer = this.createContainer(
      'live-code-content explorer-content',
      {
        display: 'flex',
        flexDirection: this.options.layout === 'horizontal' ? 'row' : 'column',
        flex: '1',
        gap: '16px',
        minHeight: '0',
      },
    );

    // Code editor section
    const editorSection = this.createContainer('live-code-editor-section', {
      flex: this.options.layout === 'horizontal' ? '1' : 'none',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '0',
    });

    const editorOptions: CodeEditorOptions = {
      language: this.options.language,
      value: this.options.initialCode,
      placeholder: this.options.placeholder,
      readOnly: this.options.readOnly,
      showLineNumbers: this.options.showLineNumbers,
      tabSize: this.options.tabSize,
      fontSize: this.options.fontSize,
      fontFamily: this.options.fontFamily,
      theme: this.options.theme,
      height: this.options.editorHeight,
      showTitle: false, // We handle the title ourselves
      showCopyButton: false, // Simplified - no copy in individual editor
      compact: this.options.compact,
      onChange: (value: string) => this.handleCodeChange(value),
    };

    this.codeEditor = new CodeEditorCSS(editorSection, editorOptions);
    this.contentContainer.appendChild(editorSection);

    // Result display section
    const resultSection = this.createContainer('live-code-result-section', {
      flex: this.options.layout === 'horizontal' ? '1' : 'none',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '0',
    });

    const resultOptions: ResultDisplayOptions = {
      language: 'json',
      height: this.options.resultHeight,
      theme: this.options.theme,
      showBorder: true,
    };

    this.resultDisplay = new ResultDisplayCSS(resultSection, resultOptions);
    this.contentContainer.appendChild(resultSection);

    mainContainer.appendChild(this.contentContainer);
    root.appendChild(mainContainer);
  }

  private shouldShowHeader(): boolean {
    return (
      (this.options.showTitle && this.options.title.length > 0) ||
      this.options.showRunButton ||
      this.options.showResetButton
    );
  }

  private createHeader(): HTMLDivElement {
    const actions: HeaderAction[] = [];

    if (this.options.showRunButton) {
      actions.push({
        id: 'run',
        icon: ICONS.play,
        title: 'Run code',
        onClick: () => this.runCode(),
        variant: 'primary',
      });
    }

    if (this.options.showResetButton) {
      actions.push({
        id: 'reset',
        icon: ICONS.reset,
        title: 'Reset to initial code',
        onClick: () => this.resetCode(),
        variant: 'default',
      });
    }

    const headerOptions: UnifiedHeaderOptions = {
      title: this.options.title,
      showTitle: this.options.showTitle,
      actions,
      compact: this.options.compact,
      className: 'live-code-header',
    };

    return this.unifiedHeader.create(headerOptions);
  }

  private setupEventListeners(): void {
    // Auto-run functionality
    if (this.options.autoRun) {
      // Already handled in handleCodeChange via debouncing
    }
  }

  private handleCodeChange(value: string): void {
    this.options.onCodeChange();

    if (this.options.autoRun) {
      // Debounce auto-run
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.runCode();
      }, this.options.debounceMs);
    }
  }

  private async runCode(): Promise<void> {
    try {
      const code = this.codeEditor.getValue();

      // Visual feedback - update run button
      if (this.options.showRunButton) {
        this.unifiedHeader.updateAction('run', {
          icon: ICONS.settings, // Using settings as "running" indicator
          variant: 'warning',
        });
      }

      // Execute code
      const result = await this.options.onRun(code);

      // Display result
      this.resultDisplay.setValue(result);

      // Reset run button
      if (this.options.showRunButton) {
        this.unifiedHeader.updateAction('run', {
          icon: ICONS.check,
          variant: 'success',
        });

        setTimeout(() => {
          this.unifiedHeader.updateAction('run', {
            icon: ICONS.play,
            variant: 'primary',
          });
        }, 1500);
      }
    } catch (error) {
      // Display error
      this.resultDisplay.setValue(error);

      // Show error feedback
      if (this.options.showRunButton) {
        this.unifiedHeader.updateAction('run', {
          icon: ICONS.warning,
          variant: 'danger',
        });

        setTimeout(() => {
          this.unifiedHeader.updateAction('run', {
            icon: ICONS.play,
            variant: 'primary',
          });
        }, 2000);
      }
    }
  }

  private resetCode(): void {
    this.codeEditor.setValue(this.options.initialCode);
    this.resultDisplay.clear();
    this.options.onReset();

    // Visual feedback
    if (this.options.showResetButton) {
      this.unifiedHeader.updateAction('reset', {
        icon: ICONS.check,
        variant: 'success',
      });

      setTimeout(() => {
        this.unifiedHeader.updateAction('reset', {
          icon: ICONS.reset,
          variant: 'default',
        });
      }, 1500);
    }
  }

  private getStyles(): string {
    return `
      ${getThemeCSS()}
      
      /* LiveCode specific styles */
      .live-code-content {
        /* Ensure proper flex behavior */
        min-height: 0;
      }
      
      .live-code-editor-section,
      .live-code-result-section {
        /* Ensure sections can shrink */
        min-height: 0;
        min-width: 0;
      }
      
      /* Responsive layout adjustments */
      @media (max-width: 768px) {
        .live-code-content {
          flex-direction: column !important;
        }
      }
    `;
  }

  // Public API methods
  getCode(): string {
    return this.codeEditor.getValue();
  }

  setCode(code: string): void {
    this.codeEditor.setValue(code);
  }

  getResult(): unknown {
    return this.resultDisplay.getValue();
  }

  setResult(result: unknown): void {
    this.resultDisplay.setValue(result);
  }

  clearResult(): void {
    this.resultDisplay.clear();
  }

  async run(): Promise<void> {
    await this.runCode();
  }

  reset(): void {
    this.resetCode();
  }

  setLanguage(language: SupportedLanguage): void {
    this.options.language = language;
    this.codeEditor.setLanguage(language);
  }

  focus(): void {
    this.codeEditor.focus();
  }

  protected onDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (this.codeEditor && !this.codeEditor.isDestroyed()) {
      this.codeEditor.destroy();
    }

    if (this.resultDisplay && !this.resultDisplay.isDestroyed()) {
      this.resultDisplay.destroy();
    }

    if (this.unifiedHeader) {
      this.unifiedHeader.destroy();
    }
  }
}
