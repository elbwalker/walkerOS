// Main entry point for the @walkerOS/explorer package

// Core functionality
export { ExplorerStateManager, generateId } from './core/state-manager';
export { BaseComponent } from './core/base-component';
export { highlightSyntax, DEFAULT_SYNTAX_CSS } from './core/syntax-highlighter';

// Components
export { CodeEditor } from './components/code-editor';
export { HtmlPreview } from './components/html-preview';
export { ResultDisplay } from './components/result-display';
export { CodeBox } from './components/code-box';
export { DestinationInit } from './components/destination-init';
export { DestinationPush } from './components/destination-push';

// Factory functions
export {
  createDestination,
  createDestinationGroup,
  createMockDestination,
} from './core/destination-factory';

// Legacy utilities (maintaining backward compatibility)
export { highlightHTML } from './utils/highlighter';

// Standalone factory function (following walkerOS patterns)
export { default as createExplorer } from './standalone';

// Export types
export type { ExplorerConfig } from './types';

export type {
  DestinationFunction,
  DestinationState,
} from './core/state-manager';
export type {
  DestinationInstance,
  DestinationContextOptions,
} from './core/destination-factory';
export type { CodeEditorOptions } from './components/code-editor';
export type { HtmlPreviewOptions } from './components/html-preview';
export type { ResultDisplayOptions } from './components/result-display';
export type { CodeBoxOptions } from './components/code-box';
export type { DestinationInitOptions } from './components/destination-init';
export type { DestinationPushOptions } from './components/destination-push';
export type {
  SupportedLanguage,
  HighlightOptions,
} from './core/syntax-highlighter';
