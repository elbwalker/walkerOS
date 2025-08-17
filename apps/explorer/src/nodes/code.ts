/**
 * Code Node
 * Base node for displaying and editing code
 */

import { BaseNode } from './base';
import type { GraphNode, NodeConfig, Port } from '../graph/types';

export class CodeNode extends BaseNode<string, string> {
  protected language: string;
  protected editable: boolean;

  constructor(config: {
    id: string;
    position?: { x: number; y: number };
    nodeConfig?: NodeConfig;
  }) {
    super({ ...config, type: 'code' });
    this.language = config.nodeConfig?.language || 'javascript';
    this.editable = config.nodeConfig?.editable ?? true;
  }

  protected initializePorts(): GraphNode['ports'] {
    return {
      input: [
        {
          id: 'input',
          type: 'input',
          dataType: 'any',
          label: 'Code Input',
          accepts: ['html', 'event', 'events', 'mapping', 'config', 'any'],
        },
      ],
      output: [
        {
          id: 'output',
          type: 'output',
          dataType: 'any',
          label: 'Code Output',
        },
      ],
    };
  }

  protected getDefaultLabel(): string {
    return 'Code';
  }

  async process(input: string): Promise<string> {
    // CodeNode simply passes through or formats the input
    if (typeof input !== 'string') {
      // Convert to formatted string if not already
      return JSON.stringify(input, null, 2);
    }
    return input;
  }

  /**
   * Set the code value directly (for editing)
   */
  setCode(code: string): void {
    this.setValue(code);
    this.setOutputValue(code);
  }

  /**
   * Get the current code
   */
  getCode(): string {
    const value = this.getValue();
    return typeof value === 'string' ? value : '';
  }

  /**
   * Set language for syntax highlighting
   */
  setLanguage(language: string): void {
    this.language = language;
  }

  /**
   * Get language
   */
  getLanguage(): string {
    return this.language;
  }

  /**
   * Set editable state
   */
  setEditable(editable: boolean): void {
    this.editable = editable;
  }

  /**
   * Check if editable
   */
  isEditable(): boolean {
    return this.editable;
  }
}
