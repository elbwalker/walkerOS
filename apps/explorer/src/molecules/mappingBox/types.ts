/**
 * MappingBox Types
 * Type definitions for the mapping component
 */

import type { Mapping, WalkerOS } from '@walkeros/core';

export type MappingMode = 'visual' | 'code';

export interface MappingBoxOptions {
  label?: string;
  value?: Mapping.Rules;
  mode?: MappingMode;
  onChange?: (mapping: Mapping.Rules) => void;
  onModeChange?: (mode: MappingMode) => void;
  showControls?: boolean;
  showConfigurationManager?: boolean;
  readOnly?: boolean;
}

export interface MappingBoxAPI {
  // Value management
  getValue(): Mapping.Rules;
  setValue(mapping: Mapping.Rules): void;
  clear(): void;

  // Mode control
  getMode(): MappingMode;
  setMode(mode: MappingMode): void;

  // Validation
  validate(): ValidationResult;

  // Lifecycle
  destroy(): void;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  preview?: any;
  executionTime?: number;
}

export interface ValidationError {
  path: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

// Visual component types
export interface EventPatternConfig {
  entity?: string;
  action?: string;
  isWildcard?: {
    entity?: boolean;
    action?: boolean;
  };
}

export interface ValueMappingConfig {
  id: string;
  key: string;
  type: 'key' | 'static' | 'function' | 'map' | 'loop' | 'set' | 'condition';
  value?: any;
  expanded?: boolean;
  depth?: number;
  parentId?: string;
  children?: ValueMappingConfig[];
  isValid?: boolean;
  validationError?: string;
}

export interface MappingNode {
  id: string;
  key: string;
  config: {
    key?: string;
    value?: any;
    fn?: string | Function;
    condition?: string | Function;
    consent?: any;
    validate?: string | Function;
    map?: Record<string, any>;
    loop?: any[];
    set?: any[];
  };
  children: MappingNode[];
  parent?: MappingNode;
  depth: number;
  expanded: boolean;
  isValid: boolean;
  validationError?: string;
}

export interface MappingTreeOptions {
  model: any;
  readOnly?: boolean;
  maxDepth?: number;
  onChange?: (tree: MappingNode[]) => void;
}

export interface FunctionEditorOptions {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: number;
}

export interface MappingPreviewOptions {
  mappingConfig: any;
  sampleEvent?: any;
  onValidation?: (result: ValidationResult) => void;
}

export interface MappingSection {
  id: string;
  type: 'event' | 'values' | 'settings';
  label: string;
  expanded: boolean;
}

// Model events
export interface ModelEvents {
  change: (data: Mapping.Rules) => void;
  validate: (result: ValidationResult) => void;
}
