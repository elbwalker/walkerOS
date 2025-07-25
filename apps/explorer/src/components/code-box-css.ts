import { BaseComponent } from '../core/base-component';
import { CodeEditorCSS, type CodeEditorOptions } from './code-editor-css';
import {
  UnifiedHeaderCSS,
  HeaderAction,
  ICONS,
  type UnifiedHeaderOptions,
} from '../core/unified-header-css';
import { type SupportedLanguage } from '../core/syntax-highlighter';
import { getThemeCSS, setElementTheme } from '../core/css-theme-system';

export interface CodeBoxOptions
  extends Omit<CodeEditorOptions, 'showTitle' | 'title' | 'showCopyButton'> {
  label?: string;
  showLabel?: boolean;
  showCopy?: boolean;
  showReset?: boolean;
  resetValue?: string;
  className?: string;
  containerHeight?: string;
  onReset?: () => void;
}

/**
 * CSS-Based CodeBox Component
 *
 * Simplified wrapper around CodeEditorCSS without format functionality.
 * Uses CSS theming with data-theme attributes.
 */
export class CodeBoxCSS extends BaseComponent {
  private options: Required<CodeBoxOptions>;
  private codeEditor!: CodeEditorCSS;
  private unifiedHeader: UnifiedHeaderCSS;
  private headerContainer?: HTMLDivElement;
  private editorContainer!: HTMLDivElement;

  constructor(container: HTMLElement | string, options: CodeBoxOptions = {}) {
    const defaultOptions = {
      // CodeEditor options
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
      onChange: options.onChange || (() => {}),
      onFocus: options.onFocus || (() => {}),
      onBlur: options.onBlur || (() => {}),

      // CodeBox specific options
      label: options.label || '',
      showLabel: options.showLabel !== undefined ? options.showLabel : true,
      showCopy: options.showCopy !== undefined ? options.showCopy : true,
      showReset: options.showReset !== undefined ? options.showReset : false,
      resetValue: options.resetValue || options.value || '',
      className: options.className || '',
      containerHeight: options.containerHeight || 'auto',
      compact: options.compact || false,
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
  }

  private createElements(): void {
    const root = this.getRoot();

    // Set theme on root
    setElementTheme(root, this.options.theme);

    // Main container
    const mainContainer = this.createContainer(
      'code-box-main explorer-component explorer-container',
      {
        display: 'flex',
        flexDirection: 'column',
        height: this.options.containerHeight,
      },
    );

    // Add custom class name if provided
    if (this.options.className) {
      mainContainer.classList.add(this.options.className);
    }

    // Header (always show if we have label or actions)
    if (this.shouldShowHeader()) {
      this.headerContainer = this.createHeader();
      mainContainer.appendChild(this.headerContainer);
    }

    // Editor container
    this.editorContainer = this.createContainer('code-box-editor', {
      flex: '1',
      minHeight: '0',
      position: 'relative',
    });

    // Create the code editor without its own header
    this.codeEditor = new CodeEditorCSS(this.editorContainer, {
      ...this.options,
      showTitle: false, // We handle the title/header ourselves
      showCopyButton: false, // We handle actions in our header
      height: '100%', // Fill the container
    });

    mainContainer.appendChild(this.editorContainer);
    root.appendChild(mainContainer);
  }

  private shouldShowHeader(): boolean {
    return (
      (this.options.showLabel && this.options.label.length > 0) ||
      this.options.showCopy ||
      this.options.showReset
    );
  }

  private createHeader(): HTMLDivElement {
    const actions: HeaderAction[] = [];

    if (this.options.showCopy) {
      actions.push({
        id: 'copy',
        icon: ICONS.copy,
        title: 'Copy code',
        onClick: () => this.copyToClipboard(),
        variant: 'default',
      });
    }

    if (this.options.showReset) {
      actions.push({
        id: 'reset',
        icon: ICONS.reset,
        title: 'Reset to default',
        onClick: () => this.resetCode(),
        variant: 'default',
      });
    }

    const headerOptions: UnifiedHeaderOptions = {
      title: this.options.label,
      showTitle: this.options.showLabel,
      actions,
      compact: this.options.compact,
      className: 'code-box-header',
    };

    return this.unifiedHeader.create(headerOptions);
  }

  private async copyToClipboard(): Promise<void> {
    try {
      const value = this.codeEditor.getValue();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback - focus the editor and select all, then copy
        this.codeEditor.focus();
        document.execCommand('selectAll');
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

  private resetCode(): void {
    this.codeEditor.setValue(this.options.resetValue);
    this.options.onReset();

    // Visual feedback
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

  private getStyles(): string {
    return `
      ${getThemeCSS()}
      
      /* CodeBox specific styles */
      .code-box-editor {
        /* Ensure the editor fills the container properly */
        min-height: 120px;
      }
    `;
  }

  // Public API methods
  getValue(): string {
    return this.codeEditor.getValue();
  }

  setValue(value: string): void {
    this.codeEditor.setValue(value);
  }

  setLanguage(language: SupportedLanguage): void {
    this.options.language = language;
    this.codeEditor.setLanguage(language);
  }

  setLabel(label: string): void {
    this.options.label = label;
    this.unifiedHeader.updateTitle(label);
  }

  focus(): void {
    this.codeEditor.focus();
  }

  blur(): void {
    this.codeEditor.blur();
  }

  insertText(text: string): void {
    this.codeEditor.insertText(text);
  }

  updateAction(actionId: string, updates: Partial<HeaderAction>): void {
    this.unifiedHeader.updateAction(actionId, updates);
  }

  protected onDestroy(): void {
    if (this.codeEditor && !this.codeEditor.isDestroyed()) {
      this.codeEditor.destroy();
    }
    if (this.unifiedHeader) {
      this.unifiedHeader.destroy();
    }
  }
}
