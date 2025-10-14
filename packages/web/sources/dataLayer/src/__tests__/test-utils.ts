import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { sourceDataLayer } from '../index';
import type { Types } from '../types';

// Test utility for creating properly typed mock push function
export function createMockPush(collectedEvents: WalkerOS.Event[]) {
  const mockPush = jest.fn();

  // Handle Collector.PushFn signature: (event: DeepPartialEvent, context?) => Promise<PushResult>
  mockPush.mockImplementation((event: WalkerOS.DeepPartialEvent) => {
    // Create a full event from partial event
    // Extract entity/action from name
    const nameParts = (event.name || '').split(' ');
    const entity = nameParts[0] || '';
    const action = nameParts.slice(1).join(' ') || '';

    const fullEvent: WalkerOS.Event = {
      id: `test-${Date.now()}-${Math.random()}`,
      name: event.name || 'unknown',
      entity,
      action,
      data: event.data || {},
      context: event.context || {},
      globals: event.globals || {},
      user: event.user || {},
      nested: (event.nested || []).filter(
        (n): n is WalkerOS.Entity => n !== undefined,
      ),
      consent: Object.entries(event.consent || {}).reduce((acc, [key, val]) => {
        if (val !== undefined) acc[key] = val;
        return acc;
      }, {} as WalkerOS.Consent),
      custom: event.custom || {},
      trigger: event.trigger || '',
      timestamp: event.timestamp || Date.now(),
      timing: event.timing || 0,
      group: event.group || '',
      count: event.count || 0,
      version: {
        source: event.version?.source || '1.0.0',
        tagging: event.version?.tagging || 2,
      },
      source: {
        type: event.source?.type || 'dataLayer',
        id: event.source?.id || '',
        previous_id: event.source?.previous_id || '',
      },
    };
    collectedEvents.push(fullEvent);
    return Promise.resolve({
      ok: true,
      event: fullEvent,
      successful: [],
      queued: [],
      failed: [],
    });
  });

  return mockPush as jest.MockedFunction<Collector.PushFn>;
}

// Type assertion for dataLayer
export function getDataLayer(name = 'dataLayer'): unknown[] {
  return (window as Record<string, unknown>)[name] as unknown[];
}

// Helper function to create and initialize a dataLayer source with proper environment
export async function createDataLayerSource(
  collector: Collector.Instance,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  return await sourceDataLayer(config || {}, {
    push: collector.push.bind(collector),
    command: collector.command.bind(collector),
    elb: collector.sources.elb.push,
    window,
  });
}
