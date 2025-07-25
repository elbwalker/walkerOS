/**
 * LiveCodeJS Component - JavaScript evaluation with context injection
 *
 * Features:
 * - Single JavaScript editor with syntax highlighting
 * - Direct evaluation results (no iframe)
 * - Context injection for functions like getMappingValue
 * - Two-panel layout (editor + results)
 * - Automatic evaluation with debouncing
 */

import { type ComponentAPI } from '../core/Component';
import { createLiveCodeBase, type LiveCodeBaseAPI } from '../core/LiveCodeBase';
import { createCodeEditor, type CodeEditorAPI } from './CodeEditor';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { createElement, addEventListener } from '../utils/dom';
import { debounce } from '../utils/debounce';
import {
  evaluateJavaScript,
  formatEvaluationResult,
  createSafeContext,
  type EvaluationContext,
} from '../utils/evaluation';

export interface LiveCodeJSOptions {
  initCode?: string;
  context?: Record<string, unknown>;
  layout?: 'horizontal' | 'vertical';
  autoEvaluate?: boolean;
  evaluationDelay?: number;
  showLineNumbers?: boolean;
  height?: string;
  showHeader?: boolean;
  title?: string;
}

export interface LiveCodeJSAPI extends ComponentAPI {
  getCode(): string;
  setCode(code: string): void;
  setContext(context: Record<string, unknown>): void;
  evaluate(): void;
  clear(): void;
  getResults(): any[];
  setLayout(layout: 'horizontal' | 'vertical'): void;
  getLayout(): string;
}

/**
 * Create a LiveCodeJS component
 */
export function createLiveCodeJS(
  elementOrSelector: HTMLElement | string,
  options: LiveCodeJSOptions = {},
): LiveCodeJSAPI {
  // Component state
  let currentCode = options.initCode || '';
  let currentContext: EvaluationContext = createSafeContext(options.context);
  let codeEditor: CodeEditorAPI;
  let resultDisplay: ResultDisplayAPI;

  // Create base component
  const {
    api: baseApi,
    contentElement,
    cleanup,
  } = createLiveCodeBase(elementOrSelector, {
    layout: options.layout || 'horizontal',
    height: options.height,
    showHeader: options.showHeader,
    title: options.title || 'JavaScript Evaluator',
  });

  // Debounced evaluation for performance
  const debouncedEvaluate = debounce(() => {
    if (options.autoEvaluate !== false) {
      evaluateCode();
    }
  }, options.evaluationDelay || 500);

  /**
   * Create the panel structure
   */
  function createPanels(): void {
    contentElement.innerHTML = '';

    // Create editor panel
    const editorPanel = createElement('div', {
      className: 'explorer-livecode-base__panel',
    });

    const editorHeader = createElement('div', {
      className: 'explorer-livecode-base__panel-header',
      textContent: 'JavaScript Code',
    });

    const editorContainer = createElement('div', {
      className: 'explorer-livecode-base__panel-content',
    });

    editorPanel.appendChild(editorHeader);
    editorPanel.appendChild(editorContainer);

    // Create result panel
    const resultPanel = createElement('div', {
      className: 'explorer-livecode-base__panel',
    });

    const resultHeader = createElement('div', {
      className: 'explorer-livecode-base__panel-header',
      textContent: 'Results',
    });

    const resultContainer = createElement('div', {
      className: 'explorer-livecode-base__panel-content',
    });

    resultPanel.appendChild(resultHeader);
    resultPanel.appendChild(resultContainer);

    // Assemble panels
    contentElement.appendChild(editorPanel);
    contentElement.appendChild(resultPanel);

    // Create components
    codeEditor = createCodeEditor(editorContainer, {
      language: 'javascript',
      value: currentCode,
      showLineNumbers: options.showLineNumbers || false,
      height: '100%',
      onChange: (value) => {
        currentCode = value;
        debouncedEvaluate();
      },
    });

    resultDisplay = createResultDisplay(resultContainer, {
      height: '100%',
      showCopyButton: true,
      showTimestamps: false,
      maxResults: 10,
    });

    // Initial evaluation
    if (currentCode && options.autoEvaluate !== false) {
      evaluateCode();
    }
  }

  /**
   * Evaluate the current code
   */
  async function evaluateCode(): Promise<void> {
    if (!currentCode.trim()) {
      resultDisplay.clear();
      return;
    }

    try {
      resultDisplay.clear();
      resultDisplay.addInfo('Evaluating...', 'Status');

      const result = await evaluateJavaScript(currentCode, currentContext);

      // Clear status
      resultDisplay.clear();

      if (result.success) {
        const formattedResult = formatEvaluationResult(result.result);
        resultDisplay.addValue(formattedResult, 'Result');

        if (result.executionTime !== undefined) {
          resultDisplay.addInfo(
            `Execution time: ${result.executionTime.toFixed(2)}ms`,
            'Performance',
          );
        }
      } else {
        resultDisplay.addError(result.error || 'Unknown error', 'Error');
      }
    } catch (error) {
      resultDisplay.clear();
      resultDisplay.addError(String(error), 'Evaluation Error');
    }
  }

  // Enhanced API
  const api: LiveCodeJSAPI = {
    ...baseApi,

    getCode(): string {
      return currentCode;
    },

    setCode(code: string): void {
      currentCode = code;
      codeEditor.setValue(code);
      if (options.autoEvaluate !== false) {
        debouncedEvaluate();
      }
    },

    setContext(context: Record<string, unknown>): void {
      currentContext = createSafeContext(context);
      if (options.autoEvaluate !== false) {
        debouncedEvaluate();
      }
    },

    evaluate(): void {
      evaluateCode();
    },

    clear(): void {
      currentCode = '';
      codeEditor.setValue('');
      resultDisplay.clear();
    },

    getResults(): any[] {
      return resultDisplay.getResults();
    },

    setLayout(layout: 'horizontal' | 'vertical'): void {
      baseApi.setLayout(layout);
    },

    getLayout(): string {
      return baseApi.getLayout();
    },

    destroy(): void {
      cleanup.forEach((fn) => fn());
      codeEditor?.destroy();
      resultDisplay?.destroy();
      baseApi.destroy();
    },
  };

  // Initialize component
  createPanels();

  // Mount the base component
  api.mount();

  return api;
}
