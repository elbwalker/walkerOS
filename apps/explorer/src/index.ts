/**
 * WalkerOS Explorer
 * Pure vanilla JavaScript component library for interactive code examples
 */

// Main organism components (what users typically use)
export { createLiveCode } from './organisms/liveCode';

// Molecule components (for advanced users)
export { createCodeBox } from './molecules/codeBox';
export { createResultBox } from './molecules/resultBox';

// Layout components
export { createColumns } from './layouts/columns';

// Atom components (for building custom components)
export { createBox } from './atoms/box';
export { createEditor } from './atoms/editor';
export { createButton } from './atoms/button';
export { createLabel } from './atoms/label';

// Utilities (for advanced usage)
export { evaluate, formatValue, formatError } from './lib/evaluate';
export { highlight, escapeHTML } from './lib/syntax';
export { debounce, throttle } from './lib/debounce';
export { createShadow, createElement } from './lib/dom';
export { getBaseStyles, applyTheme } from './styles/theme';

// Types
export type {
  // Component APIs
  ComponentAPI,
  LiveCodeAPI,
  LiveCodeOptions,
  CodeBoxAPI,
  CodeBoxOptions,
  ResultBoxAPI,
  ResultBoxOptions,
  BoxAPI,
  BoxOptions,
  EditorAPI,
  EditorOptions,
  ButtonAPI,
  ButtonOptions,
  LabelAPI,
  LabelOptions,
  LayoutAPI,
  LayoutOptions,
  // Utility types
  ShadowContext,
  EvaluationResult,
  SyntaxToken,
  ThemeOptions,
} from './types';

// Version
export const version = '2.0.0';
