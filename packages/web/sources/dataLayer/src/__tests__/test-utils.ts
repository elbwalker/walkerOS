import type { WalkerOS } from '@walkerOS/core';

// Test utility for creating properly typed mock push function
export function createMockPush(
  collectedEvents: WalkerOS.Event[],
): WalkerOS.Collector['push'] {
  return jest.fn((event: unknown) => {
    collectedEvents.push(event as WalkerOS.Event);
    return Promise.resolve({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });
  }) as WalkerOS.Collector['push'];
}

// Type assertion for dataLayer
export function getDataLayer(name = 'dataLayer'): unknown[] {
  return (window as Record<string, unknown>)[name] as unknown[];
}
