/**
 * Editor Atom Component
 * Code editor with syntax highlighting
 */

import type { EditorOptions, EditorAPI } from '../types';
import { createElement, addListener } from '../lib/dom';
import { highlight } from '../lib/syntax';
import { debounce } from '../lib/debounce';

/**
 * Create an editor component
 */
export function createEditor(
  container: HTMLElement,
  options: EditorOptions = {},
): EditorAPI {
  let language = options.language || 'javascript';
  let value = options.value || '';

  // Create editor structure
  const wrapper = createElement('div', { class: 'elb-editor' });

  // Line numbers container (optional)
  let lineNumbers: HTMLElement | null = null;
  if (options.lineNumbers) {
    lineNumbers = createElement('div', { class: 'elb-editor-lines' });
    wrapper.appendChild(lineNumbers);
  }

  // Editor container
  const editorContainer = createElement('div', {
    class: 'elb-editor-container',
  });

  // Syntax highlighting overlay
  const highlightOverlay = createElement('pre', {
    class: 'elb-editor-highlight',
    'aria-hidden': 'true',
  });
  const highlightCode = createElement('code');
  highlightOverlay.appendChild(highlightCode);

  // Textarea for editing
  const editorId = `elb-editor-${Math.random().toString(36).substr(2, 9)}`;
  const textarea = createElement('textarea', {
    class: 'elb-editor-textarea',
    id: editorId,
    name: editorId,
    placeholder: options.placeholder || '',
    readonly: options.readOnly,
    spellcheck: false,
    autocorrect: 'off',
    autocapitalize: 'off',
  }) as HTMLTextAreaElement;
  textarea.value = value;

  editorContainer.appendChild(highlightOverlay);
  editorContainer.appendChild(textarea);
  wrapper.appendChild(editorContainer);
  container.appendChild(wrapper);

  // Update syntax highlighting
  const updateHighlight = () => {
    highlightCode.innerHTML = highlight(textarea.value, language);
    updateLineNumbers();
  };

  // Update line numbers
  const updateLineNumbers = () => {
    if (!lineNumbers) return;

    const lines = textarea.value.split('\n').length;
    const numbers = Array.from({ length: lines }, (_, i) => i + 1);

    lineNumbers.innerHTML = numbers
      .map((n) => `<div class="elb-editor-line-number">${n}</div>`)
      .join('');
  };

  // Sync scroll between textarea and highlight
  const syncScroll = () => {
    highlightOverlay.scrollTop = textarea.scrollTop;
    highlightOverlay.scrollLeft = textarea.scrollLeft;
    if (lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  };

  // Handle input changes - immediate highlighting, debounced callback
  const handleInput = () => {
    value = textarea.value;
    updateHighlight(); // Immediate syntax highlighting
    debouncedOnChange(); // Debounced onChange callback
  };

  // Debounced onChange callback
  const debouncedOnChange = debounce(() => {
    if (options.onChange) {
      options.onChange(value);
    }
  }, 150);

  // Event listeners
  const cleanupInput = addListener(textarea, 'input', handleInput);
  const cleanupScroll = addListener(textarea, 'scroll', syncScroll);

  // Initial highlight
  updateHighlight();

  // Inject styles
  injectEditorStyles(container);

  // API
  return {
    getValue: () => value,

    setValue: (newValue: string) => {
      value = newValue;
      textarea.value = newValue;
      updateHighlight();
    },

    setLanguage: (lang: string) => {
      language = lang as any;
      updateHighlight();
    },

    setReadOnly: (readOnly: boolean) => {
      textarea.readOnly = readOnly;
    },

    focus: () => {
      textarea.focus();
    },

    destroy: () => {
      cleanupInput();
      cleanupScroll();
      wrapper.remove();
    },
  };
}

/**
 * Inject editor styles
 */
function injectEditorStyles(container: HTMLElement): void {
  const styles = `
    .elb-editor {
      display: flex;
      height: 100%;
      font-family: var(--elb-font-mono);
      font-size: var(--elb-font-size-sm);
      line-height: 1.6;
      background: transparent;
    }
    
    .elb-editor-lines {
      flex-shrink: 0;
      padding: 0;
      background: transparent;
      border-right: 1px solid var(--elb-border);
      overflow-y: hidden;
    }
    
    .elb-editor-line-number {
      padding: 0 var(--elb-spacing-sm);
      color: var(--elb-muted);
      text-align: right;
      user-select: none;
      height: 1.6em;
    }
    
    .elb-editor-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    
    .elb-editor-highlight,
    .elb-editor-textarea {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      font: inherit;
      line-height: inherit;
      white-space: pre;
      overflow: auto;
    }
    
    .elb-editor-highlight {
      pointer-events: none;
      background: transparent;
    }
    
    .elb-editor-highlight code {
      font: inherit;
      color: var(--elb-fg);
    }
    
    /* Syntax highlighting tokens */
    .elb-editor-highlight .elb-syntax-keyword { color: var(--elb-syntax-keyword) !important; }
    .elb-editor-highlight .elb-syntax-string { color: var(--elb-syntax-string) !important; }
    .elb-editor-highlight .elb-syntax-number { color: var(--elb-syntax-number) !important; }
    .elb-editor-highlight .elb-syntax-comment { color: var(--elb-syntax-comment) !important; }
    .elb-editor-highlight .elb-syntax-function { color: var(--elb-syntax-function) !important; }
    .elb-editor-highlight .elb-syntax-operator { color: var(--elb-syntax-operator) !important; }
    .elb-editor-highlight .elb-syntax-punctuation { color: var(--elb-syntax-punctuation) !important; }
    
    .elb-editor-textarea {
      resize: none;
      border: none;
      outline: none;
      background: transparent;
      color: transparent;  /* Make text transparent so syntax highlighting shows through */
      caret-color: var(--elb-accent);
      z-index: 1;
    }
    
    /* Make placeholder visible */
    .elb-editor-textarea::placeholder {
      color: var(--elb-muted);
    }
    
    .elb-editor-textarea::selection {
      background: var(--elb-accent);
      opacity: 0.3;
    }
    
    .elb-editor-textarea:focus {
      outline: 2px solid var(--elb-accent);
      outline-offset: -2px;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;

  // Insert styles in parent if it's a shadow root
  const root = container.getRootNode();
  if (root instanceof ShadowRoot) {
    root.appendChild(styleElement);
  } else {
    container.appendChild(styleElement);
  }
}
