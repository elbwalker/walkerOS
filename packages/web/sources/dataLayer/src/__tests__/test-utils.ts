import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { sourceDataLayer } from '../index';
import type { DataLayerSourceConfig } from '../types';

// Test utility for creating properly typed mock elb function
export function createMockPush(collectedEvents: WalkerOS.Event[]) {
  const mockElb = jest.fn();

  // Handle the different overloads of Elb.Fn
  mockElb.mockImplementation((event: unknown, ...args: unknown[]) => {
    collectedEvents.push(event as WalkerOS.Event);
    return Promise.resolve({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });
  });

  return mockElb as jest.MockedFunction<Elb.Fn>;
}

// Type assertion for dataLayer
export function getDataLayer(name = 'dataLayer'): unknown[] {
  return (window as Record<string, unknown>)[name] as unknown[];
}

// Helper function to create and initialize a dataLayer source with proper environment
export async function createDataLayerSource(
  collector: Collector.Instance,
  config?: Partial<DataLayerSourceConfig>,
): Promise<Source.Instance<DataLayerSourceConfig>> {
  return await sourceDataLayer(config || {}, {
    elb: collector.push.bind(collector),
    window,
  });
}
