import { BaseComponent } from '../core/base-component';
import { CodeEditor, type CodeEditorOptions } from './code-editor';
import { type SupportedLanguage } from '../core/syntax-highlighter';
import { SharedHeader, type HeaderAction, ICONS } from '../core/shared-header';

export interface CodeBoxOptions
  extends Omit<CodeEditorOptions, 'showCopyButton' | 'showFormatButton'> {
  label?: string;
  showLabel?: boolean;
  showCopy?: boolean;
  showFormat?: boolean;
  showReset?: boolean;
  resetValue?: string;
  showFullScreen?: boolean;
  className?: string;
  containerHeight?: string;
  onReset?: () => void;
  onFullScreen?: () => void;
}

/**
 * Smart CodeBox wrapper component that provides a complete code editing experience
 * Combines CodeEditor with labels, actions, and consistent styling
 */
export class CodeBox extends BaseComponent {
  private options: Required<CodeBoxOptions>;
  private codeEditor!: CodeEditor;
  private headerContainer?: HTMLDivElement;
  private editorContainer!: HTMLDivElement;
  private sharedHeader: SharedHeader;

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
      label: options.label || 'Code',
      showLabel: options.showLabel !== undefined ? options.showLabel : true,
      showCopy: options.showCopy !== undefined ? options.showCopy : true,
      showFormat: options.showFormat || false,
      showReset: options.showReset || false,
      resetValue: options.resetValue || options.value || '',
      showFullScreen: options.showFullScreen || false,
      className: options.className || '',
      containerHeight: options.containerHeight || 'auto',
      onReset: options.onReset || (() => {}),
      onFullScreen: options.onFullScreen || (() => {}),
    };

    super(container, { useShadowDOM: true, autoInitialize: false });

    this.options = defaultOptions;
    this.sharedHeader = new SharedHeader(this.createElement.bind(this));
    this.initialize();
  }

  protected initialize(): void {
    this.injectStyles(this.getStyles());
    this.createElements();
    this.createCodeEditor();
  }

  private createElements(): void {
    const root = this.getRoot();

    // Main container
    const mainContainer = this.createContainer('code-box-container', {
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      backgroundColor: this.options.theme === 'dark' ? '#1f2937' : '#ffffff',
      overflow: 'hidden',
      height: this.options.containerHeight,
    });

    if (this.options.className) {
      mainContainer.className += ` ${this.options.className}`;
    }

    // Header with label and actions
    if (this.options.showLabel || this.hasActions()) {
      this.headerContainer = this.createHeader();
      mainContainer.appendChild(this.headerContainer);
    }

    // Editor container
    this.editorContainer = this.createContainer('code-box-editor', {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '0', // Important for flex container with overflow
    });

    mainContainer.appendChild(this.editorContainer);
    root.appendChild(mainContainer);
  }

  private createHeader(): HTMLDivElement {
    const actions: HeaderAction[] = [];

    if (this.options.showCopy) {
      actions.push({
        id: 'copy',
        icon: ICONS.copy,
        title: 'Copy code',
        onClick: () => this.copyCode(),
      });
    }

    if (this.options.showFormat) {
      actions.push({
        id: 'format',
        icon: ICONS.format,
        title: 'Format code',
        onClick: () => this.formatCode(),
      });
    }

    if (this.options.showReset) {
      actions.push({
        id: 'reset',
        icon: ICONS.reset,
        title: 'Reset to original value',
        onClick: () => this.reset(),
      });
    }

    if (this.options.showFullScreen) {
      actions.push({
        id: 'fullscreen',
        icon: ICONS.fullscreen,
        title: 'Full screen',
        onClick: () => this.options.onFullScreen(),
      });
    }

    return this.sharedHeader.create({
      label: this.options.label,
      showLabel: this.options.showLabel,
      actions,
      theme: this.options.theme,
      className: 'code-box-header',
    });
  }

  private createCodeEditor(): void {
    // Create code editor with combined options
    const editorOptions: CodeEditorOptions = {
      language: this.options.language,
      value: this.options.value,
      placeholder: this.options.placeholder,
      readOnly: this.options.readOnly,
      showLineNumbers: this.options.showLineNumbers,
      tabSize: this.options.tabSize,
      fontSize: this.options.fontSize,
      fontFamily: this.options.fontFamily,
      theme: this.options.theme,
      height: this.options.height,
      maxHeight: this.options.maxHeight,
      showCopyButton: false, // Handled by CodeBox header
      showFormatButton: this.options.showFormat,
      onChange: this.options.onChange,
      onFocus: this.options.onFocus,
      onBlur: this.options.onBlur,
    };

    // Create a wrapper div for the code editor
    const editorWrapper = this.createContainer('code-box-editor-wrapper', {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    });

    this.codeEditor = new CodeEditor(editorWrapper, editorOptions);
    this.editorContainer.appendChild(editorWrapper);
  }

  private hasActions(): boolean {
    return (
      this.options.showCopy ||
      this.options.showFormat ||
      this.options.showReset ||
      this.options.showFullScreen
    );
  }

  private async copyCode(): Promise<void> {
    try {
      const code = this.codeEditor.getValue();
      await navigator.clipboard.writeText(code);

      // Update the copy button to show success state
      this.sharedHeader.updateAction('copy', {
        icon: ICONS.check,
        title: 'Copied!',
      });

      const button = this.sharedHeader.getButton('copy');
      if (button) {
        button.style.color = '#059669';
      }

      setTimeout(() => {
        this.sharedHeader.updateAction('copy', {
          icon: ICONS.copy,
          title: 'Copy code',
        });

        const button = this.sharedHeader.getButton('copy');
        if (button) {
          button.style.color =
            this.options.theme === 'dark' ? '#d1d5db' : '#6b7280';
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }

  private formatCode(): void {
    try {
      const code = this.codeEditor.getValue();
      let formatted: string;

      if (this.options.language === 'json') {
        // Format JSON
        const parsed = JSON.parse(code);
        formatted = JSON.stringify(parsed, null, 2);
      } else {
        // For other languages, do basic formatting
        formatted = code
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join('\n')
          .replace(/\{/g, '{\n  ')
          .replace(/\}/g, '\n}')
          .replace(/;/g, ';\n')
          .replace(/,/g, ',\n')
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join('\n');
      }

      this.codeEditor.setValue(formatted);
    } catch (error) {
      console.error('Failed to format code:', error);
      // For JSON parsing errors, just show a brief indication
      const button = this.sharedHeader.getButton('format');
      if (button) {
        const originalTitle = button.title;
        button.title = 'Invalid format';
        button.style.color = '#dc2626';

        setTimeout(() => {
          button.title = originalTitle;
          button.style.color =
            this.options.theme === 'dark' ? '#d1d5db' : '#6b7280';
        }, 2000);
      }
    }
  }

  private reset(): void {
    this.codeEditor.setValue(this.options.resetValue);
    this.options.onReset();
  }

  private getStyles(): string {
    return `
      ${SharedHeader.getDefaultCSS(this.options.theme)}
      
      .code-box-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }

      .code-box-container * {
        box-sizing: border-box;
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

  focus(): void {
    this.codeEditor.focus();
  }

  blur(): void {
    this.codeEditor.blur();
  }

  setLanguage(language: SupportedLanguage): void {
    this.codeEditor.setLanguage(language);
  }

  setReadOnly(readOnly: boolean): void {
    this.codeEditor.setReadOnly(readOnly);
  }

  insertText(text: string): void {
    this.codeEditor.insertText(text);
  }

  setLabel(label: string): void {
    this.options.label = label;
    this.sharedHeader.updateLabel(label);
  }

  getCodeEditor(): CodeEditor {
    return this.codeEditor;
  }

  setResetValue(value: string): void {
    this.options.resetValue = value;
  }

  protected onDestroy(): void {
    if (this.codeEditor && !this.codeEditor.isDestroyed()) {
      this.codeEditor.destroy();
    }
  }
}
