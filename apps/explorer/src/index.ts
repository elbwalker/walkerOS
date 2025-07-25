/**
 * WalkerOS Explorer - LiveCodeJS Component
 *
 * JavaScript evaluation component with context injection
 * Zero dependencies, framework-agnostic
 */

// Main component
export {
  createLiveCodeJS,
  type LiveCodeJSAPI,
  type LiveCodeJSOptions,
} from './components/LiveCodeJS';

// Supporting components (used by LiveCodeJS)
export {
  createCodeEditor,
  type CodeEditorAPI,
  type CodeEditorOptions,
} from './components/CodeEditor';

export {
  createResultDisplay,
  type ResultDisplayAPI,
  type ResultDisplayOptions,
  type ResultItem,
  type ResultType,
} from './components/ResultDisplay';

// Core types that might be useful
export { type ComponentAPI } from './core/Component';

// Utilities that might be useful
export {
  evaluateJavaScript,
  createSafeContext,
  formatEvaluationResult,
  type EvaluationContext,
  type EvaluationResult,
  type EvaluationOptions,
} from './utils/evaluation';

// Export version info
export const version = '1.0.0';
export const name = '@walkeros/explorer';
