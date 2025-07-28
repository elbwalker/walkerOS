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
import {
  createMultiColumnLayout,
  type MultiColumnLayoutAPI,
} from '../core/MultiColumnLayout';
import { createCodeEditor, type CodeEditorAPI } from './CodeEditor';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { debounce } from '../utils/debounce';
import {
  evaluateJavaScript,
  createSafeContext,
  type EvaluationContext,
} from '../utils/evaluation';
import { toggleElementTheme, getElementTheme } from '../core/css-theme-system';

export interface LiveCodeJSOptions {
  initCode?: string;
  context?: Record<string, unknown>;
  layout?: 'horizontal' | 'vertical';
  autoEvaluate?: boolean;
  evaluationDelay?: number;
  height?: string;
  showHeader?: boolean;
  title?: string;
  autoReturn?: boolean;
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
  // Foundation CSS will be injected by individual components with shadow DOM

  // Component state
  let currentCode = options.initCode || '';
  let currentContext: EvaluationContext = createSafeContext(options.context);
  let codeEditor: CodeEditorAPI;
  let resultDisplay: ResultDisplayAPI;

  // Create multi-column layout with 2 columns
  const {
    api: baseApi,
    contentElement,
    columnContainers,
    cleanup,
  } = createMultiColumnLayout(elementOrSelector, {
    columns: [
      {
        title: 'JavaScript Code',
        className: 'explorer-unified-container--code-editor',
      },
      {
        title: 'Results',
        className: 'explorer-unified-container--result-display',
      },
    ],
    layout: options.layout || 'horizontal',
    height: options.height,
    showHeader: options.showHeader,
    title: options.title || 'JavaScript Evaluator',
  });

  // Add theme toggle functionality to the first column header
  const handleThemeToggle = () => {
    const element = baseApi.getElement();
    if (element) {
      const newTheme = toggleElementTheme(element);
      // Update theme icon in any theme buttons found
      const themeButtons = element.querySelectorAll(
        '.explorer-unified-header__btn--theme',
      );
      themeButtons.forEach((btn) => {
        btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      });
    }
  };

  // Get the first column container and add theme toggle to its header
  setTimeout(() => {
    const firstColumn = baseApi.getColumnElement(0);
    if (firstColumn) {
      const container = firstColumn.querySelector(
        '.explorer-unified-container',
      ) as HTMLElement;
      if (container) {
        // Access the container's header API to add theme toggle
        const headerElement = container.querySelector(
          '.explorer-unified-header',
        );
        if (headerElement) {
          const actionsElement = headerElement.querySelector(
            '.explorer-unified-header__actions',
          );
          if (actionsElement) {
            // Create theme toggle button
            const themeBtn = document.createElement('button');
            themeBtn.className =
              'explorer-unified-header__btn explorer-unified-header__btn--theme';
            themeBtn.textContent =
              getElementTheme(baseApi.getElement()!) === 'dark' ? '☀️' : '🌙';
            themeBtn.title = 'Toggle theme';
            themeBtn.addEventListener('click', handleThemeToggle);
            actionsElement.appendChild(themeBtn);
          }
        }
      }
    }
  }, 10);

  // Debounced evaluation for performance
  const debouncedEvaluate = debounce(() => {
    if (options.autoEvaluate !== false) {
      evaluateCode();
    }
  }, options.evaluationDelay || 500);

  /**
   * Create the panel structure using multi-column layout
   */
  function createPanels(): void {
    // Get column content elements from the multi-column layout
    const editorContentElement = baseApi.getColumnContentElement(0); // First column for JavaScript Code
    const resultContentElement = baseApi.getColumnContentElement(1); // Second column for Results

    if (!editorContentElement || !resultContentElement) {
      throw new Error(
        'Failed to get column content elements from multi-column layout',
      );
    }

    // Create components
    codeEditor = createCodeEditor(editorContentElement, {
      language: 'javascript',
      value: currentCode,
      height: '100%',
      onChange: (value) => {
        currentCode = value;
        debouncedEvaluate();
      },
    });

    resultDisplay = createResultDisplay(resultContentElement, {
      height: '100%',
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

      const result = await evaluateJavaScript(currentCode, currentContext, {
        autoReturn: options.autoReturn,
      });

      if (result.success) {
        resultDisplay.addValue(result.result);
      } else {
        resultDisplay.addError(result.error || 'Unknown error');
      }
    } catch (error) {
      resultDisplay.clear();
      resultDisplay.addError(String(error));
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
