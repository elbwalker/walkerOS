/**
 * Explorer Package Type Definitions
 * Pure vanilla JavaScript component library
 */

// Base component pattern
export interface ComponentAPI {
  destroy: () => void;
}

// Shadow DOM context
export interface ShadowContext {
  shadow: ShadowRoot;
  container: HTMLElement;
}

// Atom Components
export interface BoxOptions {
  label?: string;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  noPadding?: boolean;
  headerLeft?: HTMLElement;
  headerCenter?: HTMLElement;
  headerRight?: HTMLElement;
}

export interface BoxAPI extends ComponentAPI {
  setLabel: (label: string) => void;
  getContent: () => HTMLElement;
  getHeader: () => HTMLElement | null;
  getHeaderLeft: () => HTMLElement | null;
  getHeaderCenter: () => HTMLElement | null;
  getHeaderRight: () => HTMLElement | null;
  getFooter: () => HTMLElement | null;
  getContainer: () => HTMLElement;
}

export interface EditorOptions {
  value?: string;
  language?: 'javascript' | 'json' | 'html' | 'css';
  placeholder?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  onChange?: (value: string) => void;
}

export interface EditorAPI extends ComponentAPI {
  getValue: () => string;
  setValue: (value: string) => void;
  setLanguage: (language: string) => void;
  setReadOnly: (readOnly: boolean) => void;
  focus: () => void;
}

export interface ButtonOptions {
  text?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'tab';
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean; // For tab buttons
  testId?: string; // For Playwright testing
}

export interface ButtonAPI extends ComponentAPI {
  setText: (text: string) => void;
  setDisabled: (disabled: boolean) => void;
  setActive: (active: boolean) => void; // For tab buttons
  click: () => void;
}

export interface IconButtonOptions {
  icon?:
    | 'copy'
    | 'format'
    | 'expand'
    | 'collapse'
    | 'grid'
    | 'columns'
    | 'rows'
    | 'check';
  customIcon?: string;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface IconButtonAPI extends ComponentAPI {
  setIcon: (icon: string) => void;
  setTooltip: (tooltip: string) => void;
  setDisabled: (disabled: boolean) => void;
  click: () => void;
}

export interface LabelOptions {
  text: string;
  className?: string;
}

export interface LabelAPI extends ComponentAPI {
  setText: (text: string) => void;
}

// Molecule Components
export interface CodeBoxTabsConfig {
  enabled: boolean;
  items: ('html' | 'css' | 'js')[];
  active: 'html' | 'css' | 'js';
  disabled?: ('html' | 'css' | 'js')[];
}

export interface CodeBoxOptions {
  label?: string;
  value?: string;
  language?: 'javascript' | 'json' | 'html' | 'css';
  readOnly?: boolean;
  lineNumbers?: boolean;
  showControls?: boolean;
  tabs?: CodeBoxTabsConfig;
  onChange?: (value: string) => void;
  onTabChange?: (
    tab: 'html' | 'css' | 'js',
    content: { html: string; css: string; js: string },
  ) => void;
  onFormat?: () => void;
  onCopy?: () => void;
}

export interface CodeBoxAPI extends ComponentAPI {
  getValue: () => string;
  setValue: (value: string) => void;
  getAllValues: () => { html: string; css: string; js: string };
  setAllValues: (values: { html: string; css: string; js: string }) => void;
  getActiveTab: () => 'html' | 'css' | 'js';
  setActiveTab: (tab: 'html' | 'css' | 'js') => void;
  setLabel: (label: string) => void;
  setLanguage: (language: string) => void;
  format: () => void;
  getContainer: () => HTMLElement;
}

export interface ResultBoxOptions {
  label?: string;
  value?: unknown;
  type?: 'value' | 'error' | 'log' | 'html' | 'table';
  showActions?: boolean;
  onClear?: () => void;
  onCopy?: () => void;
}

export interface ResultBoxAPI extends ComponentAPI {
  setValue: (value: unknown) => void;
  setError: (error: Error | string) => void;
  addLog: (message: string) => void;
  clear: () => void;
  setType: (type: ResultBoxOptions['type']) => void;
}

export interface PanelOptions {
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  className?: string;
}

export interface PanelAPI extends ComponentAPI {
  setTitle: (title: string) => void;
  getContent: () => HTMLElement;
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
}

// Layout Components
export interface ColumnConfig {
  width?: string | number;
  minWidth?: string;
  maxWidth?: string;
  className?: string;
}

export interface LayoutOptions {
  columns?: number | ColumnConfig[];
  direction?: 'horizontal' | 'vertical';
  gap?: string;
  responsive?: boolean;
  className?: string;
}

export interface LayoutAPI extends ComponentAPI {
  getColumn: (index: number) => HTMLElement;
  setDirection: (direction: 'horizontal' | 'vertical') => void;
  addColumn: (config?: ColumnConfig) => number;
  removeColumn: (index: number) => void;
}

// Control Panel Component
export interface ControlPanelOptions {
  visible?: boolean;
  defaultLayout?: 'columns' | 'rows' | 'grid';
  showLayoutButtons?: boolean;
  showFullscreen?: boolean;
  showGrid?: boolean;
  onLayoutChange?: (layout: 'columns' | 'rows' | 'grid') => void;
  onFullscreen?: () => void;
}

export interface ControlPanelAPI extends ComponentAPI {
  show: () => void;
  hide: () => void;
  setLayout: (layout: 'columns' | 'rows' | 'grid') => void;
}

// Overlay Component
export interface OverlayOptions {
  preventClose?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface OverlayAPI extends ComponentAPI {
  open: (element?: HTMLElement) => void;
  close: () => void;
  isOpen: () => boolean;
  setContent: (element: HTMLElement) => void;
}

// Organism Components
export interface LiveCodeOptions {
  input?: string;
  output?: unknown;
  context?: Record<string, unknown>;
  labelInput?: string;
  labelOutput?: string;
  layout?: 'horizontal' | 'vertical' | 'auto';
  height?: string;
  debounceDelay?: number;
  lineNumbers?: boolean; // Default: false
  fullscreen?: boolean; // Default: true
  textSize?: 'small' | 'regular'; // Default: 'regular'
  showControls?: boolean; // Default: false - shows control panel
}

export interface LiveCodeAPI extends ComponentAPI {
  getInput: () => string;
  setInput: (value: string) => void;
  getOutput: () => unknown;
  execute: () => Promise<void>;
  setContext: (context: Record<string, unknown>) => void;
}

export interface MappingPlaygroundOptions {
  event?: unknown;
  mapping?: unknown;
  labelEvent?: string;
  labelMapping?: string;
  labelResult?: string;
  layout?: 'horizontal' | 'vertical' | 'stacked';
  autoExecute?: boolean;
  debounceDelay?: number;
}

export interface MappingPlaygroundAPI extends ComponentAPI {
  setEvent: (event: unknown) => void;
  setMapping: (mapping: unknown) => void;
  execute: () => Promise<void>;
  getResult: () => unknown;
}

// Utility Types
export interface EvaluationResult {
  value?: unknown;
  error?: Error;
  logs?: string[];
}

export interface SyntaxToken {
  type:
    | 'keyword'
    | 'string'
    | 'number'
    | 'comment'
    | 'operator'
    | 'punctuation'
    | 'function'
    | 'default';
  value: string;
  start: number;
  end: number;
}

export interface ThemeOptions {
  mode?: 'light' | 'dark' | 'auto';
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
}

// Re-export walker types we depend on
export type { WalkerOS } from '@walkeros/core';
