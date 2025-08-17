/**
 * Console Node
 * Special formatting for logs and debugging
 */

import { BaseNode } from './base';
import type { GraphNode, NodeConfig, NodeValue } from '../graph/types';
import { isObject, isString } from '@walkeros/core';

interface ConsoleEntry {
  type: 'log' | 'info' | 'warn' | 'error' | 'group' | 'groupEnd';
  message: string;
  data?: unknown;
  timestamp: number;
}

export class ConsoleNode extends BaseNode<NodeValue, string> {
  private entries: ConsoleEntry[] = [];
  private maxEntries: number = 100;

  constructor(config: {
    id: string;
    position?: { x: number; y: number };
    nodeConfig?: NodeConfig;
  }) {
    super({ ...config, type: 'console' });
    this.maxEntries = (config.nodeConfig as any)?.maxEntries || 100;
  }

  protected initializePorts(): GraphNode['ports'] {
    return {
      input: [
        {
          id: 'data',
          type: 'input',
          dataType: 'any',
          label: 'Debug Input',
          accepts: ['html', 'event', 'events', 'mapping', 'config', 'any'],
          multiple: true,
        },
      ],
      output: [], // Console is typically an endpoint
    };
  }

  protected getDefaultLabel(): string {
    return 'Debug Console';
  }

  async process(input: NodeValue): Promise<string> {
    // Add new entry
    const entry = this.createEntry(input);
    this.addEntry(entry);

    // Return formatted output as string
    return this.getFormattedOutput();
  }

  /**
   * Create a console entry from input
   */
  private createEntry(input: NodeValue): ConsoleEntry {
    const timestamp = Date.now();

    // Determine entry type based on input
    if (isString(input)) {
      return {
        type: 'log',
        message: input,
        timestamp,
      };
    }

    if (isObject(input)) {
      // Check for error objects
      if (input instanceof Error) {
        return {
          type: 'error',
          message: input.message,
          data: {
            stack: input.stack,
            name: input.name,
          },
          timestamp,
        };
      }

      // Check for events
      if ('event' in input && 'data' in input) {
        return {
          type: 'info',
          message: `Event: ${(input as any).event}`,
          data: input,
          timestamp,
        };
      }

      // Check for destination output
      if ('type' in input && 'calls' in input) {
        return {
          type: 'group',
          message: `Destination: ${(input as any).type}`,
          data: input,
          timestamp,
        };
      }
    }

    // Default case
    return {
      type: 'log',
      message: 'Data received',
      data: input,
      timestamp,
    };
  }

  /**
   * Add entry to console
   */
  private addEntry(entry: ConsoleEntry): void {
    this.entries.push(entry);

    // Maintain max entries limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Also log to actual console for debugging
    this.logToConsole(entry);
  }

  /**
   * Log entry to browser console
   */
  private logToConsole(entry: ConsoleEntry): void {
    const prefix = `[${new Date(entry.timestamp).toLocaleTimeString()}]`;

    switch (entry.type) {
      case 'error':
        console.error(prefix, entry.message, entry.data);
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data);
        break;
      case 'info':
        console.info(prefix, entry.message, entry.data);
        break;
      case 'group':
        console.group(prefix, entry.message);
        if (entry.data) console.log(entry.data);
        break;
      case 'groupEnd':
        console.groupEnd();
        break;
      case 'log':
      default:
        console.log(prefix, entry.message, entry.data);
    }
  }

  /**
   * Log a message directly
   */
  log(message: string, data?: unknown): void {
    this.addEntry({
      type: 'log',
      message,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Log info message
   */
  info(message: string, data?: unknown): void {
    this.addEntry({
      type: 'info',
      message,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Log warning
   */
  warn(message: string, data?: unknown): void {
    this.addEntry({
      type: 'warn',
      message,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Log error
   */
  error(message: string, data?: unknown): void {
    this.addEntry({
      type: 'error',
      message,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Start a group
   */
  group(label: string): void {
    this.addEntry({
      type: 'group',
      message: label,
      timestamp: Date.now(),
    });
  }

  /**
   * End a group
   */
  groupEnd(): void {
    this.addEntry({
      type: 'groupEnd',
      message: '',
      timestamp: Date.now(),
    });
  }

  /**
   * Clear console
   */
  clear(): void {
    this.entries = [];
    console.clear();
  }

  /**
   * Get all entries
   */
  getEntries(): ConsoleEntry[] {
    return [...this.entries];
  }

  /**
   * Get formatted output
   */
  getFormattedOutput(): string {
    return this.entries
      .map((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const prefix = `[${time}] ${entry.type.toUpperCase()}:`;

        if (entry.data) {
          const dataStr =
            typeof entry.data === 'string'
              ? entry.data
              : JSON.stringify(entry.data, null, 2);
          return `${prefix} ${entry.message}\n${dataStr}`;
        }

        return `${prefix} ${entry.message}`;
      })
      .join('\n');
  }

  /**
   * Set max entries
   */
  setMaxEntries(max: number): void {
    this.maxEntries = max;
    if (this.entries.length > max) {
      this.entries = this.entries.slice(-max);
    }
  }
}
