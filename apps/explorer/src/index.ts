/**
 * WalkerOS Explorer - Main entry point
 *
 * Functional component library for walkerOS development tools
 * Zero dependencies, framework-agnostic, Tailwind-compatible
 */

// Core system
export {
  createComponent,
  generateUniqueId,
  getAllComponents,
  getComponent,
  destroyAllComponents,
  findComponents,
  type ComponentAPI,
  type ComponentOptions,
} from './core/Component';

export {
  eventBus,
  ComponentEvents,
  createScopedEventBus,
  EventDebug,
  type EventHandler,
  type EventMeta,
  type EventSubscription,
} from './core/EventBus';

export {
  defaultTheme,
  getThemeCSS,
  injectThemeCSS,
  detectCurrentTheme,
  watchThemeChanges,
  getCurrentThemeColors,
  type ThemeConfig,
  type ThemeColors,
} from './core/Theme';

// Utilities
export {
  createElement,
  getElement,
  findElement,
  getElements,
  matches,
  closest,
  addEventListener,
  delegate,
  injectCSS,
  getComputedStyleValue,
  isVisible,
  getDimensions,
  scrollIntoView,
  copyToClipboard,
  createFragment,
  setHTML,
  escapeHTML,
  observeResize,
  observeMutations,
  isInViewport,
  getUniqueSelector,
} from './utils/dom';

export {
  highlightSyntax,
  detectLanguage,
  formatCode,
  getSyntaxHighlightCSS,
  createCodeBlock,
  tokenize,
  type SyntaxToken,
  type SupportedLanguage,
} from './utils/syntax';

export {
  debounce,
  throttle,
  rafThrottle,
  debounceAsync,
  batch,
  memoize,
  scheduleIdleWork,
  measurePerformance,
} from './utils/debounce';

export {
  createCodeEditor,
  type CodeEditorAPI,
  type CodeEditorOptions,
} from './components/CodeEditor';
export {
  createPreview,
  type PreviewAPI,
  type PreviewOptions,
} from './components/Preview';
export {
  createResultDisplay,
  type ResultDisplayAPI,
  type ResultDisplayOptions,
  type ResultItem,
  type ResultType,
} from './components/ResultDisplay';
export {
  createLiveCodeHTML,
  type LiveCodeHTMLAPI,
  type LiveCodeHTMLOptions,
} from './components/LiveCodeHTML';
export {
  createLiveCodeJS,
  type LiveCodeJSAPI,
  type LiveCodeJSOptions,
} from './components/LiveCodeJS';
export {
  createEventFlow,
  type EventFlowAPI,
  type EventFlowOptions,
  type WalkerEvent,
} from './components/EventFlow';
export {
  createDestination,
  type DestinationAPI,
  type DestinationOptions,
  type DestinationConfig,
} from './components/Destination';

// Export version info
export const version = '1.0.0';
export const name = '@walkeros/explorer';
