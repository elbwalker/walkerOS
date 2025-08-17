/**
 * Base Node Class
 * Abstract base for all node types in the graph system
 */

import type {
  GraphNode,
  NodeConfig,
  NodeContext,
  NodeError,
  NodeProcessor,
  NodeState,
  NodeValidator,
  NodeValue,
  Port,
  ValidationResult,
} from '../graph/types';
import { isDefined, isObject } from '@walkeros/core';

export abstract class BaseNode<
  TInput extends NodeValue = NodeValue,
  TOutput extends NodeValue = NodeValue,
> {
  protected readonly id: string;
  protected readonly type: GraphNode['type'];
  protected position: { x: number; y: number };
  protected data: GraphNode['data'];
  protected ports: GraphNode['ports'];
  protected state: NodeState;
  protected context?: NodeContext;

  constructor(config: {
    id: string;
    type: GraphNode['type'];
    position?: { x: number; y: number };
    nodeConfig?: NodeConfig;
  }) {
    this.id = config.id;
    this.type = config.type;
    this.position = config.position || { x: 0, y: 0 };
    this.state = 'idle';

    // Initialize data
    this.data = {
      label: config.nodeConfig?.label || this.getDefaultLabel(),
      config: config.nodeConfig,
      value: config.nodeConfig?.initialValue,
    };

    // Initialize context
    this.context = config.nodeConfig?.context || { type: 'none' };

    // Initialize ports (to be defined by subclasses)
    this.ports = this.initializePorts();
  }

  /**
   * Initialize ports for this node type
   * Must be implemented by subclasses
   */
  protected abstract initializePorts(): GraphNode['ports'];

  /**
   * Process input and produce output
   * Must be implemented by subclasses
   */
  abstract process(input: TInput): Promise<TOutput>;

  /**
   * Validate input before processing
   * Can be overridden by subclasses for custom validation
   */
  validate(input: TInput): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Check required inputs
    const requiredInputs = this.ports.input.filter((p) => p.required);
    for (const port of requiredInputs) {
      if (!isDefined(port.value)) {
        errors.push({
          type: 'missing_required' as const,
          message: `Required input "${port.label || port.id}" is missing`,
          nodeId: this.id,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get default label for this node type
   */
  protected abstract getDefaultLabel(): string;

  /**
   * Execute the node
   */
  async execute(input?: TInput): Promise<TOutput> {
    try {
      this.setState('processing');

      // Use provided input or get from input ports
      const actualInput = input ?? (this.getInputValue() as TInput);

      // Validate input
      const validation = this.validate(actualInput);
      if (!validation.valid) {
        throw new Error(validation.errors[0].message);
      }

      // Process
      const result = await this.process(actualInput);

      // Set output value
      this.setOutputValue(result);

      this.setState('success');
      return result;
    } catch (error) {
      this.setState('error');
      this.setError({
        message: error instanceof Error ? error.message : String(error),
        details: error,
      });
      throw error;
    }
  }

  /**
   * Get input value from input ports
   */
  protected getInputValue(): NodeValue | undefined {
    // Get value from first input port with a value
    const inputPort = this.ports.input.find((p) => isDefined(p.value));
    return inputPort?.value;
  }

  /**
   * Set output value to output ports
   */
  protected setOutputValue(value: TOutput): void {
    // Set value to all output ports
    this.ports.output.forEach((port) => {
      port.value = value as NodeValue;
    });
    this.data.value = value as NodeValue;
  }

  /**
   * Set input port value
   */
  setInputPortValue(portId: string, value: NodeValue): void {
    const port = this.ports.input.find((p) => p.id === portId);
    if (port) {
      port.value = value;
    }
  }

  /**
   * Clear all port values
   */
  clearPorts(): void {
    [...this.ports.input, ...this.ports.output].forEach((port) => {
      port.value = undefined;
    });
  }

  // Getters and setters

  getId(): string {
    return this.id;
  }

  getType(): GraphNode['type'] {
    return this.type;
  }

  getPosition(): { x: number; y: number } {
    return { ...this.position };
  }

  setPosition(position: { x: number; y: number }): void {
    this.position = { ...position };
  }

  getData(): GraphNode['data'] {
    return { ...this.data };
  }

  setData(data: Partial<GraphNode['data']>): void {
    this.data = { ...this.data, ...data };
  }

  getValue(): NodeValue | undefined {
    return this.data.value;
  }

  setValue(value: NodeValue): void {
    this.data.value = value;
  }

  getState(): NodeState {
    return this.state;
  }

  setState(state: NodeState): void {
    this.state = state;
  }

  setError(error: NodeError): void {
    this.data.error = error;
  }

  clearError(): void {
    delete this.data.error;
  }

  getPorts(): GraphNode['ports'] {
    return {
      input: [...this.ports.input],
      output: [...this.ports.output],
    };
  }

  getInputPorts(): Port[] {
    return [...this.ports.input];
  }

  getOutputPorts(): Port[] {
    return [...this.ports.output];
  }

  getContext(): NodeContext | undefined {
    return this.context;
  }

  setContext(context: NodeContext): void {
    this.context = context;
  }

  /**
   * Convert to GraphNode representation
   */
  toGraphNode(): GraphNode {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      data: { ...this.data },
      ports: {
        input: [...this.ports.input],
        output: [...this.ports.output],
      },
      state: this.state,
    };
  }

  /**
   * Lifecycle hooks for UI integration
   */
  onConnect?(port: Port): void;
  onDisconnect?(port: Port): void;
  onUpdate?(data: Partial<GraphNode['data']>): void;
  onDestroy?(): void;
}
