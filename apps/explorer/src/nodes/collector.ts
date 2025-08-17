/**
 * Collector Node
 * Converts DOM events to walkerOS events and processes them
 */

import { BaseNode } from './base';
import type { GraphNode, NodeConfig, DOMEvent } from '../graph/types';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';

export class CollectorNode extends BaseNode<
  DOMEvent[] | WalkerOS.Event[],
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
          accepts: ['events', 'event', 'dom'], // Accept DOM events too
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
          // Internal destination to capture processed events
          internal: {
            type: 'internal',
            push: async (event: WalkerOS.Event) => {
              this.processedEvents.push(event);
              this.setOutputValue(this.processedEvents);
            },
            config: {},
          },
        },
        run: false, // Don't auto-run, we'll control execution
      });

      this.collector = collector;
      this.setContext({ type: 'collector', instance: collector });
    } catch (error) {
      console.error('Failed to initialize collector:', error);
    }
  }

  async process(
    input: DOMEvent[] | WalkerOS.Event[],
  ): Promise<WalkerOS.Event[]> {
    if (!this.collector) {
      await this.initializeCollector();
    }

    if (!this.collector) {
      throw new Error('Collector not initialized');
    }

    // Clear previous processed events
    this.processedEvents = [];

    // Check if input is DOM events or WalkerOS events
    const events = this.convertToWalkerEvents(input);

    // Process each event through the collector
    for (const event of events) {
      try {
        // Process event through collector pipeline
        // Use the push function with proper typing
        await (this.collector.push as any)(
          event.event,
          event.data,
          event.context,
        );
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }

    return this.processedEvents;
  }

  /**
   * Convert DOM events to WalkerOS events
   */
  private convertToWalkerEvents(
    input: DOMEvent[] | WalkerOS.Event[],
  ): WalkerOS.Event[] {
    // Check if first item is a DOM event
    if (input.length > 0 && 'target' in input[0]) {
      // Convert DOM events to WalkerOS events
      return (input as DOMEvent[]).map((domEvent) => {
        // Parse entity and action from data-elb and data-elbaction
        const entity = domEvent.data[''] || domEvent.data['elb'] || 'unknown';
        const actionAttr =
          domEvent.data['action'] || domEvent.data['elbaction'] || '';
        const [, action] = actionAttr.split(':');

        // Parse data attributes
        const eventData: Record<string, any> = {};
        Object.keys(domEvent.data).forEach((key) => {
          // Skip special attributes
          if (
            key === '' ||
            key === 'action' ||
            key === 'elbaction' ||
            key === 'elb'
          ) {
            return;
          }

          // Parse entity-specific data (e.g., 'product' from data-elb-product)
          if (key.startsWith(entity + '-')) {
            const dataKey = key.replace(entity + '-', '');
            const [propName, propValue] = dataKey.split(':');
            if (propValue) {
              eventData[propName] = propValue;
            } else {
              // Parse key:value from attribute value
              const attrValue = domEvent.data[key];
              if (attrValue && attrValue.includes(':')) {
                const [propName, propValue] = attrValue.split(':');
                eventData[propName] = propValue;
              }
            }
          }
        });

        // Create WalkerOS event
        return createEvent({
          event: `${entity} ${action || domEvent.type}`,
          data: eventData,
          timestamp: domEvent.timestamp,
        });
      });
    }

    // Already WalkerOS events
    return input as WalkerOS.Event[];
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
   * Get processed events
   */
  getProcessedEvents(): WalkerOS.Event[] {
    return [...this.processedEvents];
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

  /**
   * Get collector instance
   */
  getCollector(): Collector.Instance | undefined {
    return this.collector;
  }

  /**
   * Cleanup
   */
  onDestroy(): void {
    // Collector doesn't have a destroy method, but we can clear references
    this.collector = undefined;
    this.processedEvents = [];
  }
}
