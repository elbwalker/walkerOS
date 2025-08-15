/**
 * CodeBox Molecule Component
 * Code editor with label and controls
 */

import type { CodeBoxOptions, CodeBoxAPI } from '../types';
import { createBox } from '../atoms/box';
import { createEditor } from '../atoms/editor';
import { createButton } from '../atoms/button';
import { createElement } from '../lib/dom';
import { formatValue } from '../lib/evaluate';

/**
 * Create a code box component
 */
export function createCodeBox(
  element: HTMLElement,
  options: CodeBoxOptions = {},
): CodeBoxAPI {
  // Create base box
  const box = createBox(element, {
    label: options.label,
    showHeader: true,
    className: 'elb-code-box',
  });

  // Create editor in content area
  const editor = createEditor(box.getContent(), {
    value: options.value,
    language: options.language,
    readOnly: options.readOnly,
    lineNumbers: options.lineNumbers,
    onChange: options.onChange,
  });

  // Add controls to header if requested
  if (options.showControls && box.getHeader()) {
    const controls = createElement('div', { class: 'elb-code-box-controls' });

    // Format button
    if (options.onFormat) {
      const formatBtn = createButton(controls, {
        text: 'Format',
        variant: 'ghost',
        onClick: () => {
          const value = editor.getValue();
          try {
            const formatted = formatCode(
              value,
              options.language || 'javascript',
            );
            editor.setValue(formatted);
            options.onFormat?.();
          } catch (e) {
            // Silent fail on format error
          }
        },
      });
    }

    // Copy button
    if (options.onCopy) {
      const copyBtn = createButton(controls, {
        text: 'Copy',
        variant: 'ghost',
        onClick: async () => {
          const value = editor.getValue();
          await navigator.clipboard.writeText(value);
          options.onCopy?.();
        },
      });
    }

    box.getHeader()!.appendChild(controls);
  }

  // Inject additional styles
  injectCodeBoxStyles(element);

  // API
  return {
    getValue: () => editor.getValue(),

    setValue: (value: string) => {
      editor.setValue(value);
    },

    setLabel: (label: string) => {
      box.setLabel(label);
    },

    setLanguage: (language: string) => {
      editor.setLanguage(language);
    },

    format: () => {
      const value = editor.getValue();
      const formatted = formatCode(value, options.language || 'javascript');
      editor.setValue(formatted);
    },

    destroy: () => {
      editor.destroy();
      box.destroy();
    },
  };
}

/**
 * Format code based on language
 */
function formatCode(code: string, language: string): string {
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return code;
    }
  }

  // Basic JavaScript formatting (very simple)
  return code
    .replace(/;\s*}/g, ';\n}')
    .replace(/{\s*/g, '{\n  ')
    .replace(/}\s*/g, '\n}');
}

/**
 * Inject code box specific styles
 */
function injectCodeBoxStyles(element: HTMLElement): void {
  const root = element.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-code-box-styles')) return;

  const styles = `
    .elb-code-box .elb-box-content {
      padding: 0;
    }
    
    .elb-code-box-controls {
      display: flex;
      gap: var(--elb-spacing-xs);
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-code-box-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
