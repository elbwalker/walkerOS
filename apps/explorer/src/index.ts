/**
 * WalkerOS Explorer
 * Pure vanilla JavaScript component library for interactive code examples
 */

// Main organism components (what users typically use)
export { createLiveCode } from './organisms/liveCode';

// Graph system
export { createGraph, Graph } from './graph/api';
export { GraphEngine } from './graph/engine';

// Node components
export { BaseNode } from './nodes/base';
export { CodeNode } from './nodes/code';
export { HTMLNode } from './nodes/html';
export { PreviewNode } from './nodes/preview';
export { CollectorNode } from './nodes/collector';
export { MappingNode } from './nodes/mapping';
export { DestinationNode } from './nodes/destination';
export { ConsoleNode } from './nodes/console';

// Molecule components (for advanced users)
export { createCodeBox, createEventsBox } from './molecules/codeBox';
export { createResultBox } from './molecules/resultBox';
export { createControlPanel } from './molecules/controlPanel';
export { createMappingBox } from './molecules/mappingBox';

// Layout components
export { createColumns } from './layouts/columns';

// Atom components (for building custom components)
export { createBox } from './atoms/box';
export { createEditor } from './atoms/editor';
export { createButton } from './atoms/button';
export { createIconButton } from './atoms/iconButton';
export { createLabel } from './atoms/label';
export { createOverlay } from './atoms/overlay';

// Utilities (for advanced usage)
export { evaluate, formatValue, formatError, parseInput } from './lib/evaluate';
export { highlight, escapeHTML } from './lib/syntax';
export { debounce, throttle } from './lib/debounce';
export { createShadow, createElement } from './lib/dom';
export { getBaseStyles, applyTheme } from './styles/theme';

// WalkerOS integration
export { sourceBrowser } from '@walkeros/web-source-browser';

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
  ControlPanelAPI,
  ControlPanelOptions,
  MappingBoxAPI,
  MappingBoxOptions,
  MappingMode,
  BoxAPI,
  BoxOptions,
  EditorAPI,
  EditorOptions,
  ButtonAPI,
  ButtonOptions,
  IconButtonAPI,
  IconButtonOptions,
  LabelAPI,
  LabelOptions,
  LayoutAPI,
  LayoutOptions,
  OverlayAPI,
  OverlayOptions,
  // Utility types
  ShadowContext,
  EvaluationResult,
  SyntaxToken,
  ThemeOptions,
} from './types';

// Graph types
export type { GraphAPI } from './graph/api';

export type {
  GraphNode,
  GraphState,
  Edge,
  NodeType,
  NodeValue,
  NodeConfig,
  NodeContext,
  Port,
  PortRef,
  ExecutionResult,
  ValidationResult,
  GraphConfig,
  GraphEvent,
  EventHandler,
  DestinationOutput,
} from './graph/types';

// Version
export const version = '2.0.0';
