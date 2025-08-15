/**
 * LiveCode Organism Component
 * Interactive code execution with live results
 */

import type { LiveCodeOptions, LiveCodeAPI } from '../types';
import { createColumns } from '../layouts/columns';
import { createCodeBox } from '../molecules/codeBox';
import { createResultBox } from '../molecules/resultBox';
import { createShadow } from '../lib/dom';
import { getBaseStyles } from '../styles/theme';
import { evaluate } from '../lib/evaluate';
import { debounce } from '../lib/debounce';

/**
 * Create a LiveCode component
 */
export function createLiveCode(
  element: HTMLElement,
  options: LiveCodeOptions = {},
): LiveCodeAPI {
  const { shadow, container } = createShadow(element);

  // Inject base styles
  const styles = document.createElement('style');
  styles.textContent = getBaseStyles() + getLiveCodeStyles();
  shadow.appendChild(styles);

  // Create layout
  const layout = createColumns(container, {
    columns: 2,
    direction: options.layout === 'vertical' ? 'vertical' : 'horizontal',
    responsive: options.layout === 'auto',
    gap: 'var(--elb-spacing-md)',
  });

  // Create input code box
  const inputBox = createCodeBox(layout.getColumn(0), {
    label: options.labelInput || 'Input',
    value: options.input || '',
    language: 'javascript',
    lineNumbers: true,
    showControls: true,
    onChange: debounce(() => executeCode(), options.debounceDelay || 300),
  });

  // Create output result box
  const outputBox = createResultBox(layout.getColumn(1), {
    label: options.labelOutput || 'Output',
    value: options.output,
    showActions: true,
  });

  // Context for code execution
  let context = options.context || {};

  // Execute code function
  async function executeCode() {
    const code = inputBox.getValue();

    // Clear previous output
    outputBox.clear();

    try {
      // Execute with context
      const result = await evaluate(code, context);

      if (result.error) {
        outputBox.setError(result.error);
      } else {
        // Add any logs first
        if (result.logs && result.logs.length > 0) {
          result.logs.forEach((log) => outputBox.addLog(log));
        }

        // Then show the result
        if (result.value !== undefined) {
          outputBox.setValue(result.value);
        }
      }
    } catch (error) {
      outputBox.setError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // Set height if provided
  if (options.height) {
    container.style.height = options.height;
  }

  // Initial execution if input provided
  if (options.input) {
    executeCode();
  }

  // API
  return {
    getInput: () => inputBox.getValue(),

    setInput: (value: string) => {
      inputBox.setValue(value);
      executeCode();
    },

    getOutput: () => {
      // Not directly accessible from resultBox API
      // Would need to track last result
      return undefined;
    },

    execute: () => executeCode(),

    setContext: (newContext: Record<string, unknown>) => {
      context = newContext;
      executeCode();
    },

    destroy: () => {
      inputBox.destroy();
      outputBox.destroy();
      layout.destroy();
      shadow.innerHTML = '';
      element.remove();
    },
  };
}

/**
 * LiveCode-specific styles
 */
function getLiveCodeStyles(): string {
  return `
    .elb-explorer-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 200px;
    }
    
    /* Ensure boxes fill their columns */
    .elb-layout-column > * {
      height: 100%;
    }
    
    /* Responsive adjustments */
    @media (max-width: 767px) {
      .elb-explorer-root {
        min-height: 400px;
      }
      
      .elb-layout-column {
        min-height: 200px;
      }
    }
  `;
}
