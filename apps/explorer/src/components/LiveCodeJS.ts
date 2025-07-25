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
import { createElement, addEventListener, injectCSS } from '../utils/dom';
import { debounce } from '../utils/debounce';
import {
  createUnifiedContainer,
  type UnifiedContainerAPI,
} from '../core/UnifiedContainer';
import {
  evaluateJavaScript,
  createSafeContext,
  type EvaluationContext,
} from '../utils/evaluation';
import {
  CSS_THEME_VARIABLES,
  CSS_SYNTAX_HIGHLIGHTING,
  getCompleteShadowCSS,
} from '../core/css-theme-system';

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

  // Create base component with shadow DOM enabled by default
  const {
    api: baseApi,
    contentElement,
    cleanup,
  } = createLiveCodeBase(elementOrSelector, {
    layout: options.layout || 'horizontal',
    height: options.height,
    showHeader: options.showHeader,
    title: options.title || 'JavaScript Evaluator',
    useShadowDOM: true, // Enable shadow DOM by default for CSS isolation
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

    // Get shadow root for CSS isolation
    const shadowRoot = baseApi.getShadowRoot ? baseApi.getShadowRoot() : null;

    // Create editor container with unified styling
    const editorContainer = createUnifiedContainer({
      className:
        'explorer-livecode-base__panel explorer-unified-container--code-editor',
      showHeader: true,
      headerOptions: {
        title: 'JavaScript Code',
      },
      shadowRoot: shadowRoot,
    });

    // Create result container with unified styling
    const resultContainer = createUnifiedContainer({
      className:
        'explorer-livecode-base__panel explorer-unified-container--result-display',
      showHeader: true,
      headerOptions: {
        title: 'Results',
      },
      shadowRoot: shadowRoot,
    });

    // Assemble panels
    contentElement.appendChild(editorContainer.getElement());
    contentElement.appendChild(resultContainer.getElement());

    // Create components
    codeEditor = createCodeEditor(editorContainer.getContentElement(), {
      language: 'javascript',
      value: currentCode,
      showLineNumbers: options.showLineNumbers || false,
      height: '100%',
      onChange: (value) => {
        currentCode = value;
        debouncedEvaluate();
      },
    });

    resultDisplay = createResultDisplay(resultContainer.getContentElement(), {
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
