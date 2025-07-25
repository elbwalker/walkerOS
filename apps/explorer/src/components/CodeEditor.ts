/**
 * CodeEditor Component - Interactive code editor with syntax highlighting
 *
 * Features:
 * - Syntax highlighting for multiple languages
 * - Live editing with change events
 * - Copy to clipboard functionality
 * - Line numbers (optional)
 * - Theme-aware styling
 * - Functional factory pattern
 */

import { createComponent, type ComponentAPI } from '../core/Component';
import {
  highlightSyntax,
  type SupportedLanguage,
  getSyntaxHighlightCSS,
} from '../utils/syntax';
import {
  createElement,
  addEventListener,
  copyToClipboard,
  injectCSS,
} from '../utils/dom';
import { debounce } from '../utils/debounce';

export interface CodeEditorOptions {
  language?: SupportedLanguage;
  value?: string;
  placeholder?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  tabSize?: number;
  fontSize?: string;
  height?: string;
  maxHeight?: string;
  showCopyButton?: boolean;
  onChange?: (value: string, language: SupportedLanguage) => void;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export interface CodeEditorAPI extends ComponentAPI {
  getValue(): string;
  setValue(value: string): void;
  getLanguage(): SupportedLanguage;
  setLanguage(language: SupportedLanguage): void;
  focus(): void;
  selectAll(): void;
  insertText(text: string): void;
  getSelection(): { start: number; end: number; text: string };
}

/**
 * Create a CodeEditor component
 */
export function createCodeEditor(
  elementOrSelector: HTMLElement | string,
  options: CodeEditorOptions = {},
): CodeEditorAPI {
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
  });

  const element = baseComponent.getElement()!;
  element.classList.add('explorer-code-editor');

  // Component state
  let currentValue = options.value || '';
  let currentLanguage: SupportedLanguage = options.language || 'text';
  let textArea: HTMLTextAreaElement;
  let highlightLayer: HTMLElement;
  let copyButton: HTMLButtonElement | null = null;
  let isHighlighting = false;

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  // Debounced highlighting for performance
  const debouncedHighlight = debounce(() => {
    updateHighlighting();
  }, 150);

  // Debounced change notification
  const debouncedChange = debounce((value: string) => {
    options.onChange?.(value, currentLanguage);
  }, 300);

  /**
   * Inject CodeEditor CSS styles
   */
  function injectStyles(): void {
    const css = `
/* CodeEditor Component Styles */
.explorer-code-editor {
  position: relative;
  border: 1px solid var(--explorer-border-primary, #e5e7eb);
  border-radius: 12px;
  background: var(--explorer-bg-primary, #ffffff);
  overflow: hidden;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.explorer-code-editor:focus-within {
  border-color: var(--explorer-interactive-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.explorer-code-editor--readonly {
  background: var(--explorer-bg-secondary);
}

.explorer-code-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--explorer-bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--explorer-border-primary, #e5e7eb);
  font-size: 12px;
  color: var(--explorer-text-secondary, #6b7280);
  border-radius: 12px 12px 0 0;
}

.explorer-code-editor__language {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-code-editor__language-badge {
  background: var(--explorer-interactive-primary, #2563eb);
  color: var(--explorer-text-inverse, #ffffff);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.explorer-code-editor__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.explorer-code-editor__copy-btn {
  background: none;
  border: 1px solid transparent;
  color: var(--explorer-text-secondary, #6b7280);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 14px;
}

.explorer-code-editor__copy-btn:hover {
  background: var(--explorer-interactive-hover, #f3f4f6);
  color: var(--explorer-text-primary, #111827);
  border-color: var(--explorer-border-primary, #e5e7eb);
}

.explorer-code-editor__copy-btn:active {
  transform: scale(0.95);
}

.explorer-code-editor__content {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.explorer-code-editor__textarea {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 12px 16px 40px 16px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--explorer-text-primary, #111827);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  z-index: 2;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
  caret-color: var(--explorer-interactive-primary, #2563eb);
  box-sizing: border-box;
}

.explorer-code-editor__textarea::placeholder {
  color: var(--explorer-text-muted, #9ca3af);
  font-style: italic;
}

.explorer-code-editor__highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 12px 16px 40px 16px;
  margin: 0;
  border: none;
  background: transparent;
  color: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
  z-index: 1;
  pointer-events: none;
  overflow: auto;
  box-sizing: border-box;
}

.explorer-code-editor__highlight pre {
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--explorer-text-primary);
}

.explorer-code-editor--with-line-numbers .explorer-code-editor__textarea,
.explorer-code-editor--with-line-numbers .explorer-code-editor__highlight {
  padding-left: 70px;
}

.explorer-code-editor__line-numbers {
  position: absolute;
  top: 0;
  left: 0;
  width: 54px;
  padding: 12px 8px 40px 8px;
  background: var(--explorer-bg-tertiary, #f9fafb);
  border-right: 1px solid var(--explorer-border-primary, #e5e7eb);
  color: var(--explorer-text-muted, #9ca3af);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  text-align: right;
  user-select: none;
  pointer-events: none;
  white-space: pre;
  z-index: 3;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
  height: 100%;
  box-sizing: border-box;
}

/* Syntax highlighting integration */
.explorer-code-editor .syntax-keyword { color: #d73a49 !important; font-weight: 600; }
.explorer-code-editor .syntax-string { color: #032f62 !important; }
.explorer-code-editor .syntax-number { color: #005cc5 !important; }
.explorer-code-editor .syntax-comment { color: #6a737d !important; font-style: italic; }
.explorer-code-editor .syntax-function { color: #6f42c1 !important; font-weight: 500; }
.explorer-code-editor .syntax-tag { color: #22863a !important; font-weight: 600; }
.explorer-code-editor .syntax-attribute { color: #6f42c1 !important; }
.explorer-code-editor .syntax-value { color: #032f62 !important; }
.explorer-code-editor .syntax-operator { color: #d73a49 !important; }
.explorer-code-editor .syntax-type { color: #005cc5 !important; font-weight: 500; }
.explorer-code-editor .syntax-property { color: #6f42c1 !important; }
.explorer-code-editor .syntax-elb-attribute { color: #28a745 !important; font-weight: 700; }
.explorer-code-editor .syntax-elb-value { color: #28a745 !important; font-weight: 500; }

/* Responsive design */
@media (max-width: 768px) {
  .explorer-code-editor__textarea,
  .explorer-code-editor__highlight {
    font-size: 13px;
    padding: 10px 12px 32px 12px;
  }
  
  .explorer-code-editor--with-line-numbers .explorer-code-editor__textarea,
  .explorer-code-editor--with-line-numbers .explorer-code-editor__highlight {
    padding-left: 55px;
  }
  
  .explorer-code-editor__line-numbers {
    width: 43px;
    padding: 10px 6px 32px 6px;
    font-size: 13px;
  }
  
  .explorer-code-editor__header {
    padding: 8px 12px;
  }
}
`;

    injectCSS(css, 'explorer-code-editor-styles');

    // Also inject global syntax highlighting CSS
    injectCSS(getSyntaxHighlightCSS(), 'syntax-highlighting-styles');
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): void {
    element.innerHTML = '';

    // Create header (optional)
    if (options.showCopyButton || currentLanguage !== 'text') {
      const header = createElement('div', {
        className: 'explorer-code-editor__header',
      });

      // Language indicator
      if (currentLanguage !== 'text') {
        const languageSection = createElement('div', {
          className: 'explorer-code-editor__language',
        });
        const languageBadge = createElement('span', {
          className: 'explorer-code-editor__language-badge',
          textContent: currentLanguage,
        });
        languageSection.appendChild(languageBadge);
        header.appendChild(languageSection);
      }

      // Actions
      if (options.showCopyButton) {
        const actions = createElement('div', {
          className: 'explorer-code-editor__actions',
        });

        copyButton = createElement('button', {
          className: 'explorer-code-editor__copy-btn',
          innerHTML: '📋',
          title: 'Copy code',
        }) as HTMLButtonElement;

        actions.appendChild(copyButton);
        header.appendChild(actions);
      }

      element.appendChild(header);
    }

    // Create content container
    const content = createElement('div', {
      className: 'explorer-code-editor__content',
    });

    // Set height
    if (options.height) {
      content.style.height = options.height;
    } else if (options.maxHeight) {
      content.style.maxHeight = options.maxHeight;
      content.style.overflow = 'auto';
    } else {
      content.style.height = '200px';
    }

    // Create textarea
    textArea = createElement('textarea', {
      className: 'explorer-code-editor__textarea',
      placeholder: options.placeholder || `Enter ${currentLanguage} code...`,
      spellcheck: 'false',
      autocomplete: 'off',
      autocorrect: 'off',
      autocapitalize: 'off',
    }) as HTMLTextAreaElement;

    if (options.readOnly) {
      textArea.readOnly = true;
      element.classList.add('explorer-code-editor--readonly');
    }

    if (options.tabSize) {
      textArea.style.tabSize = options.tabSize.toString();
    }

    if (options.fontSize) {
      textArea.style.fontSize = options.fontSize;
    }

    textArea.value = currentValue;

    // Create highlight layer
    highlightLayer = createElement('div', {
      className: 'explorer-code-editor__highlight',
    });

    content.appendChild(highlightLayer);
    content.appendChild(textArea);

    element.appendChild(content);

    // Add line numbers if requested - after content is in DOM
    if (options.showLineNumbers) {
      element.classList.add('explorer-code-editor--with-line-numbers');
      updateLineNumbers();
    }
  }

  /**
   * Update syntax highlighting
   */
  function updateHighlighting(): void {
    if (isHighlighting) return;
    isHighlighting = true;

    requestAnimationFrame(() => {
      const highlighted = highlightSyntax(currentValue, currentLanguage);
      highlightLayer.innerHTML = `<pre>${highlighted}</pre>`;
      isHighlighting = false;
    });
  }

  /**
   * Update line numbers
   */
  function updateLineNumbers(): void {
    if (!options.showLineNumbers) return;

    let lineNumbersEl = element.querySelector(
      '.explorer-code-editor__line-numbers',
    ) as HTMLElement;

    if (!lineNumbersEl) {
      lineNumbersEl = createElement('div', {
        className: 'explorer-code-editor__line-numbers',
      });
      const content = element.querySelector('.explorer-code-editor__content')!;
      content.appendChild(lineNumbersEl);
    }

    const lines = currentValue.split('\n');
    const lineNumbers = Array.from(
      { length: Math.max(lines.length, 1) },
      (_, i) => i + 1,
    );
    lineNumbersEl.textContent = lineNumbers.join('\n');
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners(): void {
    // Textarea events
    const onInput = () => {
      const newValue = textArea.value;
      if (newValue !== currentValue) {
        currentValue = newValue;
        debouncedHighlight();
        debouncedChange(newValue);

        if (options.showLineNumbers) {
          updateLineNumbers();
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Tab handling
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textArea.selectionStart;
        const end = textArea.selectionEnd;
        const tabChar = ' '.repeat(options.tabSize || 2);

        textArea.value =
          currentValue.substring(0, start) +
          tabChar +
          currentValue.substring(end);
        textArea.selectionStart = textArea.selectionEnd =
          start + tabChar.length;

        onInput();
      }
    };

    const onScroll = () => {
      highlightLayer.scrollTop = textArea.scrollTop;
      highlightLayer.scrollLeft = textArea.scrollLeft;

      // Sync line numbers scrolling
      if (options.showLineNumbers) {
        const lineNumbersEl = element.querySelector(
          '.explorer-code-editor__line-numbers',
        ) as HTMLElement;
        if (lineNumbersEl) {
          lineNumbersEl.scrollTop = textArea.scrollTop;
        }
      }
    };

    cleanupFunctions.push(addEventListener(textArea, 'input', onInput));
    cleanupFunctions.push(addEventListener(textArea, 'keydown', onKeyDown));
    cleanupFunctions.push(addEventListener(textArea, 'scroll', onScroll));

    // Copy button
    if (copyButton) {
      const onCopy = async () => {
        const success = await copyToClipboard(currentValue);
        if (success) {
          copyButton!.innerHTML = '✓';
          setTimeout(() => {
            if (copyButton) copyButton.innerHTML = '📋';
          }, 1000);
        }
      };

      cleanupFunctions.push(addEventListener(copyButton, 'click', onCopy));
    }
  }

  // Enhanced API
  const api: CodeEditorAPI = {
    ...baseComponent,

    getValue(): string {
      return currentValue;
    },

    setValue(value: string): void {
      currentValue = value;
      textArea.value = value;
      updateHighlighting();
      if (options.showLineNumbers) {
        updateLineNumbers();
      }
    },

    getLanguage(): SupportedLanguage {
      return currentLanguage;
    },

    setLanguage(language: SupportedLanguage): void {
      currentLanguage = language;
      textArea.placeholder = options.placeholder || `Enter ${language} code...`;

      // Update language badge if it exists
      const badge = element.querySelector(
        '.explorer-code-editor__language-badge',
      );
      if (badge) {
        badge.textContent = language;
      }

      updateHighlighting();
      options.onLanguageChange?.(language);
    },

    focus(): void {
      textArea.focus();
    },

    selectAll(): void {
      textArea.select();
    },

    insertText(text: string): void {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;

      const newValue =
        currentValue.substring(0, start) + text + currentValue.substring(end);
      this.setValue(newValue);

      // Move cursor to end of inserted text
      textArea.selectionStart = textArea.selectionEnd = start + text.length;
      textArea.focus();

      options.onChange?.(newValue, currentLanguage);
    },

    getSelection(): { start: number; end: number; text: string } {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      return {
        start,
        end,
        text: currentValue.substring(start, end),
      };
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
  updateHighlighting();

  // Mount the base component
  api.mount();

  return api;
}
