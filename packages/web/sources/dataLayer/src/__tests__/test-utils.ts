import type { WalkerOS, Collector } from '@walkeros/core';

// Test utility for creating properly typed mock push function
export function createMockPush(
  collectedEvents: WalkerOS.Event[],
): Collector.Instance['push'] {
  return jest.fn((event: unknown) => {
    collectedEvents.push(event as WalkerOS.Event);
    return Promise.resolve({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });
  }) as Collector.Instance['push'];
}

// Type assertion for dataLayer
export function getDataLayer(name = 'dataLayer'): unknown[] {
  return (window as Record<string, unknown>)[name] as unknown[];
}
