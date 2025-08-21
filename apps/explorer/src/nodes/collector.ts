/**
 * Collector Node
 * Converts DOM events to walkerOS events and processes them
 */

import { BaseNode } from './base';
import type { GraphNode, NodeConfig, DOMEvent } from '../graph/types';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
// Removed browser source import - now handled by playground

export class CollectorNode extends BaseNode<
  WalkerOS.Event[],
  WalkerOS.Event[]
> {
  private collector?: Collector.Instance;
  private processedEvents: WalkerOS.Event[] = [];

  constructor(config: {
    id: string;
    position?: { x: number; y: number };
    nodeConfig?: NodeConfig;
  }) {
    super({ ...config, type: 'collector' });
    this.initializeCollector();
  }

  protected initializePorts(): GraphNode['ports'] {
    return {
      input: [
        {
          id: 'events',
          type: 'input',
          dataType: 'events',
          label: 'Event Stream',
          required: true,
          accepts: ['events'], // Accept Walker events from PreviewNode
          multiple: true, // Can accept from multiple sources
        },
      ],
      output: [
        {
          id: 'processed',
          type: 'output',
          dataType: 'events',
          label: 'Processed Events',
        },
      ],
    };
  }

  protected getDefaultLabel(): string {
    return 'Event Collector';
  }

  /**
   * Initialize the collector instance
   */
  private async initializeCollector(): Promise<void> {
    try {
      const { collector } = await createCollector({
        destinations: {
          // Internal destination to capture processed events and forward to connected nodes
          internal: {
            type: 'internal',
            push: async (event: WalkerOS.Event) => {
              this.processedEvents.push(event);
              this.setOutputValue(this.processedEvents);

              // Also notify any connected preview nodes
              this.notifyConnectedNodes(event);
            },
            config: {},
          },
        },
        run: false, // Don't auto-run, browser source will handle walker run
      });

      this.collector = collector;
      this.setContext({ type: 'collector', instance: collector });
      console.debug('CollectorNode initialized with shared collector instance');
    } catch (error) {
      console.error('Failed to initialize collector:', error);
    }
  }

  /**
   * Notify connected preview nodes about new events
   */
  private notifyConnectedNodes(event: WalkerOS.Event): void {
    // This would require access to the graph engine to find connected nodes
    // For now, we'll rely on the graph execution flow
  }

  async process(input: WalkerOS.Event[]): Promise<WalkerOS.Event[]> {
    if (!this.collector) {
      await this.initializeCollector();
    }

    if (!this.collector) {
      throw new Error('Collector not initialized');
    }

    // Clear previous processed events
    this.processedEvents = [];

    // Process each Walker event through the collector
    for (const event of input) {
      try {
        // Process event through collector pipeline
        // Pass the complete event as a partial event
        await this.collector.push(event);
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }

    return this.processedEvents;
  }

  /**
   * Add a destination to the collector
   */
  async addDestination(name: string, destination: any): Promise<void> {
    if (!this.collector) return;

    // Add destination to the collector's destinations object
    this.collector.destinations[name] = destination;
  }

  /**
   * Remove a destination from the collector
   */
  removeDestination(name: string): void {
    if (!this.collector) return;

    // Remove destination from the collector's destinations object
    delete this.collector.destinations[name];
  }

  /**
   * Get the collector instance
   */
  getCollector(): Collector.Instance | undefined {
    return this.collector;
  }

  /**
   * Get processed events
   */
  getProcessedEvents(): WalkerOS.Event[] {
    return [...this.processedEvents];
  }

  /**
   * Get collector configuration
   */
  getConfig(): Collector.Config | undefined {
    return this.collector?.config;
  }

  /**
   * Update collector configuration
   */
  async updateConfig(config: Partial<Collector.Config>): Promise<void> {
    if (!this.collector) return;

    // Recreate collector with new config
    const currentConfig = this.collector.config;
    const { collector } = await createCollector({
      ...currentConfig,
      ...config,
    });

    this.collector = collector;
    this.setContext({ type: 'collector', instance: collector });
  }

  /**
   * Clear processed events
   */
  clearProcessedEvents(): void {
    this.processedEvents = [];
    this.setOutputValue([]);
  }

  /**
   * Handle consent updates
   */
  async updateConsent(consent: WalkerOS.Consent): Promise<void> {
    if (!this.collector) return;

    // Update consent via push command
    await this.collector.push('walker consent', consent);
  }

  // Removed browser source setup - now handled by playground

  /**
   * Cleanup
   */
  onDestroy(): void {
    // Collector doesn't have a destroy method, but we can clear references
    this.collector = undefined;
    this.processedEvents = [];
  }
}
