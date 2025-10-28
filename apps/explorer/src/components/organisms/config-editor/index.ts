/**
 * Generic ConfigEditor Component
 *
 * A universal visual configuration editor that works at any depth
 * with any configuration type.
 *
 * Main Exports:
 * - ConfigEditor: Main component (use this)
 * - ConfigEditorBox: Box wrapper with Code/Visual toggle
 * - ConfigEditorTabs: Core editor tabs (without box)
 *
 * Types:
 * - ConfigEditorBoxProps: Props for ConfigEditorBox
 * - ConfigEditorTabsProps: Props for ConfigEditorTabs
 * - NavigationState: Navigation state for persistence
 */

export { ConfigEditor } from './config-editor';
export { ConfigEditorBox } from './config-editor-box';
export { ConfigEditorTabs } from './config-editor-tabs';

export type { ConfigEditorBoxProps } from './config-editor-box';
export type {
  ConfigEditorTabsProps,
  NavigationState,
} from './config-editor-tabs';
