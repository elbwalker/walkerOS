/**
 * Graph Execution Engine
 * Manages node execution, data flow, and graph state
 */

import type {
  GraphNode,
  GraphState,
  Edge,
  ExecutionResult,
  ValidationResult,
  GraphEvent,
  EventHandler,
  GraphEventData,
  NodeValue,
  PortRef,
  NodeType,
  NodeConfig,
} from './types';
import { BaseNode } from '../nodes/base';
import { CodeNode } from '../nodes/code';
import { HTMLNode } from '../nodes/html';
import { PreviewNode } from '../nodes/preview';
import { CollectorNode } from '../nodes/collector';
import { MappingNode } from '../nodes/mapping';
import { DestinationNode } from '../nodes/destination';
import { ConsoleNode } from '../nodes/console';
import { isDefined } from '@walkeros/core';

export class GraphEngine {
  private nodes: Map<string, BaseNode>;
  private edges: Map<string, Edge>;
  private executionOrder: string[];
  private executionState: GraphState['execution']['state'];
  private eventHandlers: Map<GraphEvent, Set<EventHandler>>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.executionOrder = [];
    this.executionState = 'idle';
    this.eventHandlers = new Map();
  }

  /**
   * Add a node to the graph
   */
  addNode(
    type: NodeType,
    config?: NodeConfig & { position?: { x: number; y: number } },
  ): string {
    const id = this.generateNodeId(type);
    const nodeConfig = {
      id,
      position: config?.position,
      nodeConfig: config,
    };

    let node: BaseNode;
    switch (type) {
      case 'code':
        node = new CodeNode(nodeConfig);
        break;
      case 'html':
        node = new HTMLNode(nodeConfig);
        break;
      case 'preview':
        node = new PreviewNode(nodeConfig);
        break;
      case 'collector':
        node = new CollectorNode(nodeConfig);
        break;
      case 'mapping':
        node = new MappingNode(nodeConfig);
        break;
      case 'destination':
        node = new DestinationNode(nodeConfig as any);
        break;
      case 'console':
        node = new ConsoleNode(nodeConfig);
        break;
      default:
        throw new Error(`Unknown node type: ${type}`);
    }

    this.nodes.set(id, node);
    this.updateExecutionOrder();
    this.emit('nodeAdded', { nodeId: id });

    return id;
  }

  /**
   * Remove a node from the graph
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove connected edges
    const connectedEdges = Array.from(this.edges.entries()).filter(
      ([, edge]) =>
        edge.source.nodeId === nodeId || edge.target.nodeId === nodeId,
    );

    connectedEdges.forEach(([edgeId]) => this.removeEdge(edgeId));

    // Cleanup node
    if (node.onDestroy) {
      node.onDestroy();
    }

    this.nodes.delete(nodeId);
    this.updateExecutionOrder();
    this.emit('nodeRemoved', { nodeId });
  }

  /**
   * Connect two nodes
   */
  connect(source: PortRef, target: PortRef): string | undefined {
    // Validate connection
    if (!this.canConnect(source, target)) {
      return undefined;
    }

    const edgeId = this.generateEdgeId(source, target);

    // Get port data types
    const sourceNode = this.nodes.get(source.nodeId);
    const targetNode = this.nodes.get(target.nodeId);
    if (!sourceNode || !targetNode) return undefined;

    const sourcePort = sourceNode
      .getOutputPorts()
      .find((p) => p.id === source.portId);
    const targetPort = targetNode
      .getInputPorts()
      .find((p) => p.id === target.portId);
    if (!sourcePort || !targetPort) return undefined;

    const edge: Edge = {
      id: edgeId,
      source,
      target,
      dataType: sourcePort.dataType,
    };

    this.edges.set(edgeId, edge);
    this.updateExecutionOrder();
    this.emit('edgeAdded', { edgeId });

    return edgeId;
  }

  /**
   * Disconnect an edge
   */
  removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) return;

    // Clear target node input
    const targetNode = this.nodes.get(edge.target.nodeId);
    if (targetNode) {
      targetNode.setInputPortValue(edge.target.portId, undefined as any);
    }

    this.edges.delete(edgeId);
    this.updateExecutionOrder();
    this.emit('edgeRemoved', { edgeId });
  }

  /**
   * Check if two ports can be connected
   */
  canConnect(source: PortRef, target: PortRef): boolean {
    // Can't connect to same node
    if (source.nodeId === target.nodeId) return false;

    // Check nodes exist
    const sourceNode = this.nodes.get(source.nodeId);
    const targetNode = this.nodes.get(target.nodeId);
    if (!sourceNode || !targetNode) return false;

    // Check ports exist
    const sourcePort = sourceNode
      .getOutputPorts()
      .find((p) => p.id === source.portId);
    const targetPort = targetNode
      .getInputPorts()
      .find((p) => p.id === target.portId);
    if (!sourcePort || !targetPort) return false;

    // Check type compatibility
    if (targetPort.accepts) {
      if (
        !targetPort.accepts.includes(sourcePort.dataType) &&
        !targetPort.accepts.includes('any')
      ) {
        return false;
      }
    }

    // Check for cycles
    if (this.wouldCreateCycle(source.nodeId, target.nodeId)) {
      return false;
    }

    // Check if target already has connection (unless multiple allowed)
    if (!targetPort.multiple) {
      const hasConnection = Array.from(this.edges.values()).some(
        (edge) =>
          edge.target.nodeId === target.nodeId &&
          edge.target.portId === target.portId,
      );
      if (hasConnection) return false;
    }

    return true;
  }

  /**
   * Execute the graph
   */
  async execute(): Promise<ExecutionResult> {
    const startTime = Date.now();
    const results = new Map<string, NodeValue>();
    const errors = new Map<string, any>();

    try {
      this.executionState = 'running';
      this.emit('executionStarted', {});

      // Execute nodes in topological order
      for (const nodeId of this.executionOrder) {
        const node = this.nodes.get(nodeId);
        if (!node) continue;

        try {
          // Get input from connected nodes
          const input = this.getNodeInput(nodeId);

          // Execute node
          const result = await node.execute(input as any);
          results.set(nodeId, result);

          // Propagate output to connected nodes
          this.propagateOutput(nodeId, result);
        } catch (error) {
          errors.set(nodeId, {
            message: error instanceof Error ? error.message : String(error),
            details: error,
          });
          console.error(`Error executing node ${nodeId}:`, error);
        }
      }

      this.executionState = 'complete';
      this.emit('executionComplete', { result: results });

      return {
        success: errors.size === 0,
        nodes: results,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.executionState = 'error';
      this.emit('executionError', {
        error: {
          message: error instanceof Error ? error.message : String(error),
          details: error,
        },
      });

      throw error;
    }
  }

  /**
   * Execute a single node
   */
  async executeNode(nodeId: string): Promise<NodeValue> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const input = this.getNodeInput(nodeId);
    const result = await node.execute(input as any);
    this.propagateOutput(nodeId, result);

    return result;
  }

  /**
   * Get input for a node from connected edges
   */
  private getNodeInput(nodeId: string): NodeValue | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) return undefined;

    // Find edges targeting this node
    const inputEdges = Array.from(this.edges.values()).filter(
      (edge) => edge.target.nodeId === nodeId,
    );

    if (inputEdges.length === 0) {
      // No input edges, use node's own value if available
      return node.getValue();
    }

    // Get input from source nodes
    for (const edge of inputEdges) {
      const sourceNode = this.nodes.get(edge.source.nodeId);
      if (sourceNode) {
        const outputPorts = sourceNode.getOutputPorts();
        const port = outputPorts.find((p) => p.id === edge.source.portId);
        if (port && isDefined(port.value)) {
          return port.value;
        }
      }
    }

    return undefined;
  }

  /**
   * Propagate output to connected nodes
   */
  private propagateOutput(nodeId: string, output: NodeValue): void {
    // Find edges from this node
    const outputEdges = Array.from(this.edges.values()).filter(
      (edge) => edge.source.nodeId === nodeId,
    );

    for (const edge of outputEdges) {
      const targetNode = this.nodes.get(edge.target.nodeId);
      if (targetNode) {
        targetNode.setInputPortValue(edge.target.portId, output);
      }
    }
  }

  /**
   * Update execution order using topological sort
   */
  private updateExecutionOrder(): void {
    const visited = new Set<string>();
    const stack: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Visit dependencies first
      const dependencies = this.getNodeDependencies(nodeId);
      dependencies.forEach((depId) => visit(depId));

      stack.push(nodeId);
    };

    // Visit all nodes
    this.nodes.forEach((_, nodeId) => visit(nodeId));

    this.executionOrder = stack;
  }

  /**
   * Get dependencies of a node (nodes that provide input)
   */
  private getNodeDependencies(nodeId: string): string[] {
    const deps: string[] = [];

    this.edges.forEach((edge) => {
      if (edge.target.nodeId === nodeId) {
        deps.push(edge.source.nodeId);
      }
    });

    return deps;
  }

  /**
   * Check if adding an edge would create a cycle
   */
  private wouldCreateCycle(sourceId: string, targetId: string): boolean {
    // DFS to check if we can reach source from target
    const visited = new Set<string>();
    const stack = [targetId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceId) return true;

      if (visited.has(current)) continue;
      visited.add(current);

      // Add all nodes that current points to
      this.edges.forEach((edge) => {
        if (edge.source.nodeId === current) {
          stack.push(edge.target.nodeId);
        }
      });
    }

    return false;
  }

  /**
   * Validate the graph
   */
  validate(): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Check for cycles
    if (!this.isAcyclic()) {
      errors.push({
        type: 'cycle' as const,
        message: 'Graph contains cycles',
      });
    }

    // Check required inputs
    this.nodes.forEach((node, nodeId) => {
      const inputPorts = node.getInputPorts();
      inputPorts.forEach((port) => {
        if (port.required && !isDefined(port.value)) {
          // Check if there's an incoming edge
          const hasEdge = Array.from(this.edges.values()).some(
            (edge) =>
              edge.target.nodeId === nodeId && edge.target.portId === port.id,
          );

          if (!hasEdge) {
            errors.push({
              type: 'missing_required' as const,
              message: `Node ${nodeId} missing required input: ${port.label || port.id}`,
              nodeId,
            });
          }
        }
      });
    });

    // Check for unused nodes
    this.nodes.forEach((_, nodeId) => {
      const hasInput = Array.from(this.edges.values()).some(
        (edge) => edge.target.nodeId === nodeId,
      );
      const hasOutput = Array.from(this.edges.values()).some(
        (edge) => edge.source.nodeId === nodeId,
      );

      if (!hasInput && !hasOutput && this.nodes.size > 1) {
        warnings.push({
          type: 'unused_node' as const,
          message: `Node ${nodeId} is not connected`,
          nodeId,
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if graph is acyclic
   */
  isAcyclic(): boolean {
    return !Array.from(this.nodes.keys()).some((nodeId) =>
      this.wouldCreateCycle(nodeId, nodeId),
    );
  }

  /**
   * Event handling
   */
  on(event: GraphEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: GraphEvent, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(
    event: GraphEvent,
    data?: Partial<GraphEventData['data']>,
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    const eventData: GraphEventData = {
      type: event,
      timestamp: Date.now(),
      data,
    };

    handlers.forEach((handler) => handler(eventData));
  }

  /**
   * Utility methods
   */
  private generateNodeId(type: NodeType): string {
    const count = Array.from(this.nodes.values()).filter(
      (node) => node.getType() === type,
    ).length;
    return `${type}-${count + 1}`;
  }

  private generateEdgeId(source: PortRef, target: PortRef): string {
    return `${source.nodeId}:${source.portId}-${target.nodeId}:${target.portId}`;
  }

  /**
   * Get graph state
   */
  getState(): GraphState {
    const nodes = new Map<string, GraphNode>();
    this.nodes.forEach((node, id) => {
      nodes.set(id, node.toGraphNode());
    });

    return {
      nodes,
      edges: new Map(this.edges),
      execution: {
        order: [...this.executionOrder],
        state: this.executionState,
        lastRun: Date.now(),
      },
    };
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.forEach((node) => {
      if (node.onDestroy) node.onDestroy();
    });

    this.nodes.clear();
    this.edges.clear();
    this.executionOrder = [];
    this.executionState = 'idle';
  }

  /**
   * Get a specific node
   */
  getNode(nodeId: string): BaseNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getNodes(): Map<string, BaseNode> {
    return new Map(this.nodes);
  }

  /**
   * Get all edges
   */
  getEdges(): Map<string, Edge> {
    return new Map(this.edges);
  }
}
