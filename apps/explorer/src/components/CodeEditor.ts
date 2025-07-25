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
  detectLanguage,
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
  border: 1px solid var(--explorer-border-primary);
  border-radius: 8px;
  background: var(--explorer-bg-primary);
  overflow: hidden;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
}

.explorer-code-editor--readonly {
  background: var(--explorer-bg-secondary);
}

.explorer-code-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 12px;
  color: var(--explorer-text-secondary);
}

.explorer-code-editor__language {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-code-editor__language-badge {
  background: var(--explorer-interactive-primary);
  color: var(--explorer-text-inverse);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.explorer-code-editor__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.explorer-code-editor__copy-btn {
  background: none;
  border: none;
  color: var(--explorer-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.explorer-code-editor__copy-btn:hover {
  background: var(--explorer-interactive-hover);
  color: var(--explorer-text-primary);
}

.explorer-code-editor__content {
  position: relative;
  overflow: hidden;
}

.explorer-code-editor__textarea {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 12px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--explorer-text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  z-index: 2;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
}

.explorer-code-editor__textarea::placeholder {
  color: var(--explorer-text-muted);
}

.explorer-code-editor__highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 12px;
  margin: 0;
  border: none;
  background: transparent;
  color: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
  z-index: 1;
  pointer-events: none;
  overflow: auto;
}

.explorer-code-editor__highlight pre {
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--explorer-text-primary);
}

.explorer-code-editor--with-line-numbers .explorer-code-editor__textarea,
.explorer-code-editor--with-line-numbers .explorer-code-editor__highlight {
  padding-left: 50px;
}

.explorer-code-editor__line-numbers {
  position: absolute;
  top: 0;
  left: 0;
  width: 42px;
  padding: 12px 8px 12px 12px;
  background: var(--explorer-bg-tertiary);
  border-right: 1px solid var(--explorer-border-primary);
  color: var(--explorer-text-muted);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  text-align: right;
  user-select: none;
  pointer-events: none;
  white-space: pre;
  z-index: 1;
}

/* Syntax highlighting integration */
.explorer-code-editor .syntax-keyword { color: var(--explorer-syntax-keyword); font-weight: 600; }
.explorer-code-editor .syntax-string { color: var(--explorer-syntax-string); }
.explorer-code-editor .syntax-number { color: var(--explorer-syntax-number); }
.explorer-code-editor .syntax-comment { color: var(--explorer-syntax-comment); font-style: italic; }
.explorer-code-editor .syntax-tag { color: var(--explorer-syntax-tag); font-weight: 600; }
.explorer-code-editor .syntax-attribute { color: var(--explorer-syntax-attribute); }
.explorer-code-editor .syntax-value { color: var(--explorer-syntax-value); }
.explorer-code-editor .syntax-elb-attribute { color: var(--explorer-interactive-success); font-weight: 700; }
.explorer-code-editor .syntax-elb-value { color: var(--explorer-interactive-success); font-weight: 500; }

/* Responsive design */
@media (max-width: 768px) {
  .explorer-code-editor__textarea,
  .explorer-code-editor__highlight {
    font-size: 13px;
    padding: 8px;
  }
  
  .explorer-code-editor--with-line-numbers .explorer-code-editor__textarea,
  .explorer-code-editor--with-line-numbers .explorer-code-editor__highlight {
    padding-left: 40px;
  }
  
  .explorer-code-editor__line-numbers {
    width: 32px;
    padding: 8px 4px 8px 8px;
    font-size: 13px;
  }
}
`;

    injectCSS(css, 'explorer-code-editor-styles');
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
