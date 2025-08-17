/**
 * Graph System Type Definitions
 * Strictly typed with walkerOS types, no any allowed
 */

import type {
  WalkerOS,
  Collector,
  Source,
  Destination,
  Mapping,
} from '@walkeros/core';

// DOM Event type for PreviewNode
export interface DOMEvent {
  type: string;
  target: string;
  data: Record<string, any>;
  timestamp: number;
}

// Multi-code content for HTMLNode
export interface CodeContent {
  html: string;
  css: string;
  js: string;
}

// Node value types - strictly typed
export type NodeValue =
  | string // Simple strings
  | CodeContent // Multi-code content (HTML/CSS/JS)
  | WalkerOS.Event // Single event
  | WalkerOS.Event[] // Event batch
  | DOMEvent[] // DOM events from PreviewNode
  | Mapping.Rules // Mapping rules
  | DestinationOutput; // Final output

// Destination output types
export interface DestinationOutput {
  type: 'ga4' | 'meta' | 'piwikpro' | 'plausible' | 'console' | 'custom';
  calls: Array<{
    method: string;
    args: unknown[];
    timestamp: number;
  }>;
}

// Node types
export type NodeType =
  | 'code'
  | 'html'
  | 'preview'
  | 'collector'
  | 'mapping'
  | 'destination'
  | 'console';

// Node context for walkerOS integration
export type NodeContext =
  | { type: 'collector'; instance: Collector.Instance }
  | { type: 'source'; instance: Source.Instance }
  | { type: 'destination'; config: Destination.Config }
  | { type: 'mapping'; rules: Mapping.Rules }
  | { type: 'none' };

// Port data types
export type PortDataType =
  | 'html'
  | 'code'
  | 'event'
  | 'events'
  | 'dom'
  | 'element'
  | 'mapping'
  | 'config'
  | 'any';

// Port definition for connections
export interface Port<T extends NodeValue = NodeValue> {
  id: string;
  type: 'input' | 'output';
  dataType: PortDataType;
  label?: string;
  value?: T;
  accepts?: PortDataType[]; // Compatible input types
  required?: boolean;
  multiple?: boolean; // Can accept multiple connections
}

// Node configuration
export interface NodeConfig {
  label?: string;
  editable?: boolean;
  language?: 'javascript' | 'json' | 'html' | 'css';
  context?: NodeContext;
  initialValue?: NodeValue;
}

// Node state
export type NodeState = 'idle' | 'processing' | 'success' | 'error';

// Node error
export interface NodeError {
  message: string;
  code?: string;
  details?: unknown;
}

// Node definition
export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    value?: NodeValue;
    config?: NodeConfig;
    error?: NodeError;
  };
  ports: {
    input: Port[];
    output: Port[];
  };
  state: NodeState;
}

// Edge connection
export interface Edge {
  id: string;
  source: { nodeId: string; portId: string };
  target: { nodeId: string; portId: string };
  dataType: PortDataType;
}

// Port reference
export interface PortRef {
  nodeId: string;
  portId: string;
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  nodes: Map<string, NodeValue>;
  errors: Map<string, NodeError>;
  duration: number;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'cycle' | 'type_mismatch' | 'missing_required' | 'invalid_config';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationWarning {
  type: 'unused_node' | 'deprecated' | 'performance';
  message: string;
  nodeId?: string;
}

// Graph state
export interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, Edge>;
  execution: {
    order: string[]; // Topologically sorted node IDs
    state: 'idle' | 'running' | 'complete' | 'error';
    lastRun?: number;
  };
}

// Serializable graph configuration
export interface GraphConfig {
  version: string;
  nodes: Array<{
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: {
      label: string;
      value?: unknown; // Will be validated on load
      config?: Partial<NodeConfig>;
    };
  }>;
  edges: Array<{
    id: string;
    source: PortRef;
    target: PortRef;
  }>;
}

// Graph events
export type GraphEvent =
  | 'nodeAdded'
  | 'nodeRemoved'
  | 'nodeUpdated'
  | 'edgeAdded'
  | 'edgeRemoved'
  | 'executionStarted'
  | 'executionComplete'
  | 'executionError'
  | 'stateChanged';

export type EventHandler = (event: GraphEventData) => void;

export interface GraphEventData {
  type: GraphEvent;
  timestamp: number;
  data?: {
    nodeId?: string;
    edgeId?: string;
    error?: NodeError;
    result?: unknown;
  };
}

// Node processor function
export type NodeProcessor<TInput = NodeValue, TOutput = NodeValue> = (
  input: TInput,
  context?: NodeContext,
) => Promise<TOutput>;

// Node validator function
export type NodeValidator<TInput = NodeValue> = (
  input: TInput,
  config?: NodeConfig,
) => ValidationResult;
