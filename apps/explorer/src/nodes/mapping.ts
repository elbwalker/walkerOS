/**
 * Mapping Node
 * Transform events using walkerOS mapping rules
 */

import { BaseNode } from './base';
import type { GraphNode, NodeConfig } from '../graph/types';
import type { WalkerOS, Mapping } from '@walkeros/core';
import { getMappingEvent, getMappingValue } from '@walkeros/core';

export class MappingNode extends BaseNode<WalkerOS.Event[], WalkerOS.Event[]> {
  private mappingRules: Mapping.Rules;

  constructor(config: {
    id: string;
    position?: { x: number; y: number };
    nodeConfig?: NodeConfig;
  }) {
    super({ ...config, type: 'mapping' });

    // Initialize with default or provided mapping rules
    this.mappingRules =
      (config.nodeConfig?.initialValue as Mapping.Rules) || {};
    this.setContext({ type: 'mapping', rules: this.mappingRules });
  }

  protected initializePorts(): GraphNode['ports'] {
    return {
      input: [
        {
          id: 'events',
          type: 'input',
          dataType: 'events',
          label: 'Input Events',
          required: true,
          accepts: ['events', 'event'],
        },
        {
          id: 'rules',
          type: 'input',
          dataType: 'mapping',
          label: 'Mapping Rules',
          accepts: ['mapping', 'config'],
        },
      ],
      output: [
        {
          id: 'transformed',
          type: 'output',
          dataType: 'events',
          label: 'Transformed Events',
        },
      ],
    };
  }

  protected getDefaultLabel(): string {
    return 'Event Mapping';
  }

  async process(input: WalkerOS.Event[]): Promise<WalkerOS.Event[]> {
    const transformedEvents: WalkerOS.Event[] = [];

    // Process each event through mapping
    for (const event of input) {
      const transformed = await this.transformEvent(event);
      if (transformed) {
        transformedEvents.push(transformed);
      }
    }

    return transformedEvents;
  }

  /**
   * Transform a single event using mapping rules
   */
  private async transformEvent(
    event: WalkerOS.Event,
  ): Promise<WalkerOS.Event | null> {
    try {
      // Get mapping configuration for this event
      const mappingResult = await getMappingEvent(event, this.mappingRules);
      const mappingConfig = mappingResult.eventMapping;

      if (!mappingConfig) {
        // No mapping found, return original event
        return event;
      }

      // Create transformed event
      const transformedEvent: WalkerOS.Event = {
        ...event,
        event: mappingConfig.name || event.event,
      };

      // Transform data if mapping exists
      if (mappingConfig.data) {
        const transformedData = await getMappingValue(
          event,
          mappingConfig.data,
          {},
        );
        transformedEvent.data =
          (transformedData as WalkerOS.Properties) || event.data;
      }

      // Transform custom properties if defined
      if ((mappingConfig as any).custom) {
        const customData = await getMappingValue(
          event,
          (mappingConfig as any).custom,
          {},
        );
        transformedEvent.custom = customData as WalkerOS.Properties;
      }

      return transformedEvent;
    } catch (error) {
      console.error('Error transforming event:', error);
      return event; // Return original on error
    }
  }

  /**
   * Set mapping rules
   */
  setMappingRules(rules: Mapping.Rules): void {
    this.mappingRules = rules;
    this.setValue(rules);
    this.setContext({ type: 'mapping', rules });
  }

  /**
   * Get current mapping rules
   */
  getMappingRules(): Mapping.Rules {
    return this.mappingRules;
  }

  /**
   * Add or update a mapping rule
   */
  addMappingRule(entity: string, action: string, config: Mapping.Rule): void {
    if (!this.mappingRules[entity]) {
      this.mappingRules[entity] = {};
    }
    this.mappingRules[entity][action] = config;
    this.setContext({ type: 'mapping', rules: this.mappingRules });
  }

  /**
   * Remove a mapping rule
   */
  removeMappingRule(entity: string, action?: string): void {
    if (action) {
      delete this.mappingRules[entity]?.[action];
    } else {
      delete this.mappingRules[entity];
    }
    this.setContext({ type: 'mapping', rules: this.mappingRules });
  }

  /**
   * Get example mapping configuration
   */
  static getExampleMapping(): Mapping.Rules {
    return {
      product: {
        view: {
          name: 'view_item',
          data: {
            map: {
              currency: { value: 'USD' },
              value: 'data.price',
              item_id: 'data.id',
              item_name: 'data.name',
            },
          },
        },
        add: {
          name: 'add_to_cart',
          data: {
            map: {
              currency: { value: 'USD' },
              value: 'data.price',
              items: {
                loop: [
                  'nested',
                  {
                    map: {
                      item_id: 'data.id',
                      item_name: 'data.name',
                      price: 'data.price',
                      quantity: { value: 1 },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      '*': {
        '*': {
          // Wildcard mapping for all other events
          name: 'custom_event',
          data: {
            map: {
              entity: 'entity',
              action: 'action',
            },
          },
        },
      },
    };
  }
}
