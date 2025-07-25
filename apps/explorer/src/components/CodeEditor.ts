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
  injectComponentCSS,
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
    useShadowDOM: true, // Enable shadow DOM by default for CSS isolation
  });

  const element = baseComponent.getElement()!;
  const shadowRoot = baseComponent.getShadowRoot();
  const contentRoot = baseComponent.getContentRoot() as HTMLElement;

  // Add class to both host element (for tests/API) and content root (for styling)
  element.classList.add('explorer-code-editor');
  contentRoot.classList.add('explorer-code-editor');

  // Component state
  let currentValue = options.value || '';
  let currentLanguage: SupportedLanguage = options.language || 'text';
  let textArea: HTMLTextAreaElement;
  let highlightLayer: HTMLElement;
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
   * Inject CodeEditor CSS styles with proper shadow DOM support
   */
  function injectStyles(): void {
    // Check if we're in a website context for theme detection
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    const isDark = htmlTheme === 'dark';

    // Define colors based on theme context
    const colors = isDark
      ? {
          bgPrimary: 'transparent',
          borderPrimary: '#374151',
          bgTertiary: '#4b5563',
          textPrimary: '#f3f4f6',
          textMuted: '#9ca3af',
          interactivePrimary: '#3b82f6',
        }
      : {
          bgPrimary: 'transparent',
          borderPrimary: '#e5e7eb',
          bgTertiary: '#f9fafb',
          textPrimary: '#111827',
          textMuted: '#9ca3af',
          interactivePrimary: '#2563eb',
        };

    const css = `
/* CSS Reset and theme setup for shadow DOM */
:host {
  display: block;
  width: 100%;
  height: 100%;
}

.explorer-code-editor {
  position: relative;
  background: ${colors.bgPrimary};
  overflow: hidden;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.explorer-code-editor * {
  box-sizing: border-box;
}

.explorer-code-editor:focus-within {
  border-color: ${colors.interactivePrimary};
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.explorer-code-editor--readonly {
  background: ${colors.bgTertiary};
}

.explorer-code-editor__content {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.explorer-code-editor__textarea {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  padding: 12px 16px 40px 16px !important;
  margin: 0 !important;
  border: none !important;
  outline: none !important;
  background: transparent !important;
  color: transparent !important;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  resize: none !important;
  z-index: 2 !important;
  white-space: pre !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
  caret-color: ${colors.textPrimary} !important;
  box-sizing: border-box !important;
}

.explorer-code-editor__textarea::placeholder {
  color: ${colors.textMuted};
  font-style: italic;
}

.explorer-code-editor__highlight {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  padding: 12px 16px 40px 16px !important;
  margin: 0 !important;
  border: none !important;
  background: transparent !important;
  color: ${colors.textPrimary} !important;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  white-space: pre !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
  z-index: 1 !important;
  pointer-events: none !important;
  overflow: auto !important;
  box-sizing: border-box !important;
}

.explorer-code-editor__highlight pre {
  margin: 0;
  padding: 0;
  background: transparent;
  color: ${colors.textPrimary};
}

.explorer-code-editor--with-line-numbers .explorer-code-editor__textarea,
.explorer-code-editor--with-line-numbers .explorer-code-editor__highlight {
  padding-left: 70px;
}

.explorer-code-editor__line-numbers {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 54px !important;
  padding: 12px 8px 40px 8px !important;
  margin: 0 !important;
  background: ${colors.bgTertiary} !important;
  border-right: 1px solid ${colors.borderPrimary} !important;
  color: ${colors.textMuted} !important;
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  text-align: right !important;
  user-select: none !important;
  pointer-events: none !important;
  white-space: pre !important;
  z-index: 3 !important;
  overflow: hidden !important;
  font-variant-numeric: tabular-nums !important;
  height: 100% !important;
  box-sizing: border-box !important;
}

/* Syntax highlighting integration - theme aware */
.explorer-code-editor .syntax-keyword { color: ${isDark ? '#ff6b6b' : '#d73a49'} !important; font-weight: 600; }
.explorer-code-editor .syntax-string { color: ${isDark ? '#4ecdc4' : '#032f62'} !important; }
.explorer-code-editor .syntax-number { color: ${isDark ? '#45b7d1' : '#005cc5'} !important; }
.explorer-code-editor .syntax-comment { color: ${isDark ? '#95a5a6' : '#6a737d'} !important; font-style: italic; }
.explorer-code-editor .syntax-function { color: ${isDark ? '#9b59b6' : '#6f42c1'} !important; font-weight: 500; }
.explorer-code-editor .syntax-tag { color: ${isDark ? '#2ecc71' : '#22863a'} !important; font-weight: 600; }
.explorer-code-editor .syntax-attribute { color: ${isDark ? '#9b59b6' : '#6f42c1'} !important; }
.explorer-code-editor .syntax-value { color: ${isDark ? '#4ecdc4' : '#032f62'} !important; }
.explorer-code-editor .syntax-operator { color: ${isDark ? '#ff6b6b' : '#d73a49'} !important; }
.explorer-code-editor .syntax-type { color: ${isDark ? '#45b7d1' : '#005cc5'} !important; font-weight: 500; }
.explorer-code-editor .syntax-property { color: ${isDark ? '#9b59b6' : '#6f42c1'} !important; }
.explorer-code-editor .syntax-elb-attribute { color: ${isDark ? '#2ecc71' : '#28a745'} !important; font-weight: 700; }
.explorer-code-editor .syntax-elb-value { color: ${isDark ? '#2ecc71' : '#28a745'} !important; font-weight: 500; }

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
}
`;

    // Use shadow DOM-aware CSS injection
    if (shadowRoot) {
      injectComponentCSS(css, 'explorer-code-editor-styles', shadowRoot);
      injectComponentCSS(
        getSyntaxHighlightCSS(),
        'syntax-highlighting-styles',
        shadowRoot,
      );
    } else {
      injectComponentCSS(
        css,
        'explorer-code-editor-styles',
        null,
        '.explorer-code-editor',
      );
      injectComponentCSS(
        getSyntaxHighlightCSS(),
        'syntax-highlighting-styles',
        null,
        '.explorer-code-editor',
      );
    }
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): void {
    contentRoot.innerHTML = '';

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
      content.style.height = '100%';
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

    contentRoot.appendChild(content);

    // Add line numbers if requested - after content is in DOM
    if (options.showLineNumbers) {
      contentRoot.classList.add('explorer-code-editor--with-line-numbers');
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

    let lineNumbersEl = contentRoot.querySelector(
      '.explorer-code-editor__line-numbers',
    ) as HTMLElement;

    if (!lineNumbersEl) {
      lineNumbersEl = createElement('div', {
        className: 'explorer-code-editor__line-numbers',
      });
      const content = contentRoot.querySelector(
        '.explorer-code-editor__content',
      )!;
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
        const lineNumbersEl = contentRoot.querySelector(
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
