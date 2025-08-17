/**
 * Destination Node
 * Shows final destination calls for various analytics platforms
 */

import { BaseNode } from './base';
import type { GraphNode, NodeConfig, DestinationOutput } from '../graph/types';
import type { WalkerOS } from '@walkeros/core';

export type DestinationType =
  | 'ga4'
  | 'meta'
  | 'piwikpro'
  | 'plausible'
  | 'console'
  | 'custom';

export class DestinationNode extends BaseNode<
  WalkerOS.Event[],
  DestinationOutput
> {
  private destinationType: DestinationType;
  private calls: DestinationOutput['calls'] = [];

  constructor(config: {
    id: string;
    position?: { x: number; y: number };
    nodeConfig?: NodeConfig;
  }) {
    super({ ...config, type: 'destination' });

    // Extract destination type from initial value if provided
    const initialValue = config.nodeConfig?.initialValue as DestinationOutput;
    this.destinationType = initialValue?.type || 'console';
  }

  protected initializePorts(): GraphNode['ports'] {
    return {
      input: [
        {
          id: 'events',
          type: 'input',
          dataType: 'events',
          label: 'Transformed Events',
          required: true,
          accepts: ['events', 'event'],
        },
      ],
      output: [
        {
          id: 'calls',
          type: 'output',
          dataType: 'config',
          label: 'Destination Calls',
        },
      ],
    };
  }

  protected getDefaultLabel(): string {
    const labels: Record<DestinationType, string> = {
      ga4: 'Google Analytics 4',
      meta: 'Meta Pixel',
      piwikpro: 'Piwik PRO',
      plausible: 'Plausible',
      console: 'Console Log',
      custom: 'Custom Destination',
    };
    return labels[this.destinationType] || 'Destination';
  }

  async process(input: WalkerOS.Event[]): Promise<DestinationOutput> {
    this.calls = [];

    // Process each event according to destination type
    for (const event of input) {
      const call = this.createDestinationCall(event);
      if (call) {
        this.calls.push(call);
      }
    }

    const output: DestinationOutput = {
      type: this.destinationType,
      calls: this.calls,
    };

    return output;
  }

  /**
   * Create destination-specific call
   */
  private createDestinationCall(
    event: WalkerOS.Event,
  ): DestinationOutput['calls'][0] | null {
    const timestamp = Date.now();

    switch (this.destinationType) {
      case 'ga4':
        return this.createGA4Call(event, timestamp);

      case 'meta':
        return this.createMetaCall(event, timestamp);

      case 'piwikpro':
        return this.createPiwikCall(event, timestamp);

      case 'plausible':
        return this.createPlausibleCall(event, timestamp);

      case 'console':
        return {
          method: 'console.log',
          args: ['Event:', event],
          timestamp,
        };

      case 'custom':
      default:
        return {
          method: 'customPush',
          args: [event],
          timestamp,
        };
    }
  }

  /**
   * Create GA4 gtag call
   */
  private createGA4Call(
    event: WalkerOS.Event,
    timestamp: number,
  ): DestinationOutput['calls'][0] {
    // Simulate gtag call format
    const eventName = event.event.replace(' ', '_');
    const parameters: Record<string, unknown> = {
      ...event.data,
      event_category: event.entity,
      event_label: event.action,
    };

    return {
      method: 'gtag',
      args: ['event', eventName, parameters],
      timestamp,
    };
  }

  /**
   * Create Meta Pixel fbq call
   */
  private createMetaCall(
    event: WalkerOS.Event,
    timestamp: number,
  ): DestinationOutput['calls'][0] {
    // Map common events to Meta Pixel events
    const eventMap: Record<string, string> = {
      'page view': 'PageView',
      'product view': 'ViewContent',
      'product add': 'AddToCart',
      'order complete': 'Purchase',
    };

    const fbEvent = eventMap[event.event] || 'trackCustom';
    const method = eventMap[event.event] ? 'track' : 'trackCustom';

    return {
      method: 'fbq',
      args: [method, fbEvent, event.data],
      timestamp,
    };
  }

  /**
   * Create Piwik PRO call
   */
  private createPiwikCall(
    event: WalkerOS.Event,
    timestamp: number,
  ): DestinationOutput['calls'][0] {
    return {
      method: '_paq.push',
      args: [
        ['trackEvent', event.entity, event.action, JSON.stringify(event.data)],
      ],
      timestamp,
    };
  }

  /**
   * Create Plausible call
   */
  private createPlausibleCall(
    event: WalkerOS.Event,
    timestamp: number,
  ): DestinationOutput['calls'][0] {
    return {
      method: 'plausible',
      args: [event.event, { props: event.data }],
      timestamp,
    };
  }

  /**
   * Set destination type
   */
  setDestinationType(type: DestinationType): void {
    this.destinationType = type;
    this.data.label = this.getDefaultLabel();
  }

  /**
   * Get destination type
   */
  getDestinationType(): DestinationType {
    return this.destinationType;
  }

  /**
   * Get formatted calls as code string
   */
  getCallsAsCode(): string {
    return this.calls
      .map((call) => {
        const args = call.args
          .map((arg) =>
            typeof arg === 'string' ? `'${arg}'` : JSON.stringify(arg, null, 2),
          )
          .join(', ');

        return `${call.method}(${args});`;
      })
      .join('\n');
  }

  /**
   * Get example destination configuration
   */
  static getExampleConfig(type: DestinationType): NodeConfig {
    return {
      label: `${type.toUpperCase()} Destination`,
      editable: false,
      context: {
        type: 'destination',
        config: {
          settings: { destinationType: type },
          mapping: {},
        },
      },
    };
  }
}
