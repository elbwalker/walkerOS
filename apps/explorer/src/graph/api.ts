/**
 * Graph API
 * Public interface for graph operations
 */

import { GraphEngine } from './engine';
import type {
  NodeType,
  NodeConfig,
  NodeValue,
  PortRef,
  GraphState,
  GraphConfig,
  ExecutionResult,
  ValidationResult,
  GraphEvent,
  EventHandler,
} from './types';

export interface GraphAPI {
  // Node operations
  addNode(
    type: NodeType,
    config?: NodeConfig & { position?: { x: number; y: number } },
  ): string;
  removeNode(nodeId: string): void;
  updateNode(nodeId: string, updates: Partial<NodeConfig>): void;
  getNode(nodeId: string): any;

  // Edge operations
  connect(source: PortRef, target: PortRef): string | undefined;
  disconnect(edgeId: string): void;
  canConnect(source: PortRef, target: PortRef): boolean;

  // Execution
  execute(): Promise<ExecutionResult>;
  executeNode(nodeId: string): Promise<NodeValue>;
  stop(): void;

  // State management
  getState(): GraphState;
  loadState(state: GraphState): void;
  clear(): void;

  // Serialization
  toJSON(): GraphConfig;
  fromJSON(config: GraphConfig): void;

  // Events
  on(event: GraphEvent, handler: EventHandler): void;
  off(event: GraphEvent, handler: EventHandler): void;

  // Validation
  validate(): ValidationResult;
  isAcyclic(): boolean;
}

export class Graph implements GraphAPI {
  private engine: GraphEngine;

  constructor() {
    this.engine = new GraphEngine();
  }

  // Node operations
  addNode(
    type: NodeType,
    config?: NodeConfig & { position?: { x: number; y: number } },
  ): string {
    return this.engine.addNode(type, config);
  }

  removeNode(nodeId: string): void {
    this.engine.removeNode(nodeId);
  }

  updateNode(nodeId: string, updates: Partial<NodeConfig>): void {
    const node = this.engine.getNode(nodeId);
    if (!node) return;

    if (updates.label) {
      node.setData({ label: updates.label });
    }

    if (updates.initialValue !== undefined) {
      node.setValue(updates.initialValue);
    }

    if (updates.context) {
      node.setContext(updates.context);
    }
  }

  getNode(nodeId: string): any {
    return this.engine.getNode(nodeId);
  }

  // Edge operations
  connect(source: PortRef, target: PortRef): string | undefined {
    return this.engine.connect(source, target);
  }

  disconnect(edgeId: string): void {
    this.engine.removeEdge(edgeId);
  }

  canConnect(source: PortRef, target: PortRef): boolean {
    return this.engine.canConnect(source, target);
  }

  // Execution
  async execute(): Promise<ExecutionResult> {
    return this.engine.execute();
  }

  async executeNode(nodeId: string): Promise<NodeValue> {
    return this.engine.executeNode(nodeId);
  }

  stop(): void {
    this.engine.stop();
  }

  // State management
  getState(): GraphState {
    return this.engine.getState();
  }

  loadState(state: GraphState): void {
    // Clear current graph
    this.clear();

    // Load nodes
    state.nodes.forEach((node, id) => {
      this.addNode(node.type, {
        ...node.data.config,
        position: node.position,
        label: node.data.label,
        initialValue: node.data.value,
      });
    });

    // Load edges
    state.edges.forEach((edge) => {
      this.connect(edge.source, edge.target);
    });
  }

  clear(): void {
    this.engine.clear();
  }

  // Serialization
  toJSON(): GraphConfig {
    const state = this.getState();

    return {
      version: '1.0.0',
      nodes: Array.from(state.nodes.values()).map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: node.data.label,
          value: node.data.value,
          config: node.data.config,
        },
      })),
      edges: Array.from(state.edges.values()).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    };
  }

  fromJSON(config: GraphConfig): void {
    this.clear();

    // Create nodes
    const nodeIdMap = new Map<string, string>();
    config.nodes.forEach((nodeConfig) => {
      const newId = this.addNode(nodeConfig.type, {
        ...nodeConfig.data.config,
        position: nodeConfig.position,
        label: nodeConfig.data.label,
        initialValue: nodeConfig.data.value as NodeValue,
      });
      nodeIdMap.set(nodeConfig.id, newId);
    });

    // Create edges
    config.edges.forEach((edgeConfig) => {
      const sourceId = nodeIdMap.get(edgeConfig.source.nodeId);
      const targetId = nodeIdMap.get(edgeConfig.target.nodeId);

      if (sourceId && targetId) {
        this.connect(
          { nodeId: sourceId, portId: edgeConfig.source.portId },
          { nodeId: targetId, portId: edgeConfig.target.portId },
        );
      }
    });
  }

  // Events
  on(event: GraphEvent, handler: EventHandler): void {
    this.engine.on(event, handler);
  }

  off(event: GraphEvent, handler: EventHandler): void {
    this.engine.off(event, handler);
  }

  // Validation
  validate(): ValidationResult {
    return this.engine.validate();
  }

  isAcyclic(): boolean {
    return this.engine.isAcyclic();
  }
}

/**
 * Create a new graph instance
 */
export function createGraph(): GraphAPI {
  return new Graph();
}
