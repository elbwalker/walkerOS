/**
 * Function Editor Component
 * Monaco-based editor for advanced function mapping with TypeScript support
 */

import { createElement } from '../../../lib/dom';
import type { FunctionEditorOptions } from '../types';

export interface FunctionEditorAPI {
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
  destroy(): void;
}

// Monaco Editor integration (optional - falls back to textarea if not available)
declare global {
  interface Window {
    monaco?: any;
  }
}

export function createFunctionEditor(
  container: HTMLElement,
  options: FunctionEditorOptions,
): FunctionEditorAPI {
  const { value = '', onChange, readOnly = false, height = 200 } = options;

  let editor: any = null;
  let fallbackTextarea: HTMLTextAreaElement | null = null;
  let currentValue = value;

  function init(): void {
    // Try to use Monaco Editor if available
    if (window.monaco && !readOnly) {
      initMonacoEditor();
    } else {
      initFallbackEditor();
    }
  }

  function initMonacoEditor(): void {
    container.innerHTML = '';

    const editorContainer = createElement('div', {
      class: 'elb-function-editor-monaco',
      style: `height: ${height}px; border: 1px solid var(--elb-border); border-radius: var(--elb-radius-sm);`,
    });

    container.appendChild(editorContainer);

    // Create Monaco editor instance
    editor = window.monaco.editor.create(editorContainer, {
      value: currentValue,
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      readOnly,
      fontSize: 13,
      fontFamily:
        'var(--elb-font-mono), "Monaco", "Menlo", "Ubuntu Mono", monospace',
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
    });

    // Handle value changes
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      if (newValue !== currentValue) {
        currentValue = newValue;
        onChange(newValue);
      }
    });
  }

  function initFallbackEditor(): void {
    container.innerHTML = '';

    const wrapper = createElement('div', {
      class: 'elb-function-editor-fallback',
    });

    // Header with syntax hints
    const header = createElement('div', {
      class: 'elb-function-editor-header',
    });
    header.innerHTML = `
      <div class="elb-function-editor-title">Function Mapping</div>
      <div class="elb-function-editor-hint">
        Write a function that takes (event, mapping, options) and returns a transformed value
      </div>
    `;

    // Textarea editor
    fallbackTextarea = createElement('textarea', {
      class: 'elb-function-editor-textarea',
      placeholder: `(event, mapping, options) => {
  // Transform the event data
  // Available: event.data, event.user, event.context, etc.
  
  return event.data.value;
}`,
      disabled: readOnly ? 'true' : undefined,
    }) as HTMLTextAreaElement;

    fallbackTextarea.value = currentValue;
    fallbackTextarea.style.height = `${height}px`;

    fallbackTextarea.addEventListener('input', () => {
      const newValue = fallbackTextarea!.value;
      if (newValue !== currentValue) {
        currentValue = newValue;
        onChange(newValue);
      }
    });

    // Footer with examples
    const footer = createElement('div', {
      class: 'elb-function-editor-examples',
    });
    footer.innerHTML = `
      <div class="elb-function-editor-examples-title">Examples:</div>
      <div class="elb-function-editor-example">
        <code>event => event.data.price * 1.2</code> - Add 20% to price
      </div>
      <div class="elb-function-editor-example">
        <code>event => event.user.email.split('@')[1]</code> - Extract domain from email
      </div>
      <div class="elb-function-editor-example">
        <code>event => event.data.total > 100 ? 'high' : 'low'</code> - Conditional values
      </div>
    `;

    wrapper.appendChild(header);
    wrapper.appendChild(fallbackTextarea);
    wrapper.appendChild(footer);
    container.appendChild(wrapper);
  }

  function addStyles(): void {
    const styleId = 'elb-function-editor-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .elb-function-editor-monaco {
        border-radius: var(--elb-radius-sm);
        overflow: hidden;
      }
      
      .elb-function-editor-fallback {
        display: flex;
        flex-direction: column;
        gap: var(--elb-spacing-sm);
      }
      
      .elb-function-editor-header {
        padding: var(--elb-spacing-sm) var(--elb-spacing-md);
        background: var(--elb-hover);
        border-radius: var(--elb-radius-sm);
        border: 1px solid var(--elb-border);
      }
      
      .elb-function-editor-title {
        font-weight: 600;
        font-size: var(--elb-font-size-sm);
        color: var(--elb-fg);
        margin-bottom: var(--elb-spacing-xs);
      }
      
      .elb-function-editor-hint {
        font-size: var(--elb-font-size-xs);
        color: var(--elb-muted);
        line-height: 1.4;
      }
      
      .elb-function-editor-textarea {
        width: 100%;
        padding: var(--elb-spacing-sm);
        border: 1px solid var(--elb-border);
        border-radius: var(--elb-radius-sm);
        background: var(--elb-surface);
        color: var(--elb-fg);
        font-family: var(--elb-font-mono);
        font-size: var(--elb-font-size-sm);
        line-height: 1.5;
        resize: vertical;
        min-height: 120px;
      }
      
      .elb-function-editor-textarea:focus {
        outline: none;
        border-color: var(--elb-accent);
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
      }
      
      .elb-function-editor-examples {
        padding: var(--elb-spacing-sm);
        background: var(--elb-bg);
        border-radius: var(--elb-radius-sm);
        border: 1px solid var(--elb-border);
      }
      
      .elb-function-editor-examples-title {
        font-weight: 600;
        font-size: var(--elb-font-size-xs);
        color: var(--elb-fg);
        margin-bottom: var(--elb-spacing-xs);
      }
      
      .elb-function-editor-example {
        margin-bottom: var(--elb-spacing-xs);
        font-size: var(--elb-font-size-xs);
        color: var(--elb-muted);
      }
      
      .elb-function-editor-example:last-child {
        margin-bottom: 0;
      }
      
      .elb-function-editor-example code {
        background: var(--elb-surface);
        padding: 2px 4px;
        border-radius: 2px;
        font-family: var(--elb-font-mono);
        color: var(--elb-accent);
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize
  addStyles();
  init();

  return {
    getValue(): string {
      return currentValue;
    },

    setValue(newValue: string): void {
      currentValue = newValue;
      if (editor) {
        editor.setValue(newValue);
      } else if (fallbackTextarea) {
        fallbackTextarea.value = newValue;
      }
    },

    focus(): void {
      if (editor) {
        editor.focus();
      } else if (fallbackTextarea) {
        fallbackTextarea.focus();
      }
    },

    destroy(): void {
      if (editor) {
        editor.dispose();
        editor = null;
      }
      fallbackTextarea = null;
      container.innerHTML = '';
    },
  };
}
