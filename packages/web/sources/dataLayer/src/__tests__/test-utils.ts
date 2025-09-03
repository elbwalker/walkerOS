import type { WalkerOS, Elb } from '@walkeros/core';

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
