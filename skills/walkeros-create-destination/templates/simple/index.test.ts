import { destinationVendor } from '.';
import type { Destination, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Settings } from './types';
import { events, outputs, env as mockEnv } from '../../examples';

/**
 * Test template for simple destinations.
 *
 * Key patterns:
 * 1. Use createPushContext() helper - standardizes context creation
 * 2. Include id field - required in context
 * 3. Use rule instead of mapping - property renamed in PushContext
 * 4. Use examples for test data - don't hardcode test values
 */

// Helper to create push context for testing
function createPushContext(
  overrides: Partial<Destination.PushContext<Settings>> = {},
): Destination.PushContext<Settings> {
  return {
    config: {},
    env: mockEnv.push,
    logger: createMockLogger(),
    id: 'test-vendor',
    collector: {} as Collector.Instance,
    data: {},
    rule: undefined,
    ...overrides,
  };
}

describe('destinationVendor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('page view produces correct output', () => {
    const mockSdk = jest.fn();
    const context = createPushContext({
      env: {
        window: { vendorSdk: mockSdk } as unknown as Window,
        document: {} as Document,
      },
      data: { url: '/home', title: 'Home Page' },
    });

    destinationVendor.push(events.pageView, context);

    // Verify against expected output from examples
    expect(mockSdk).toHaveBeenCalledWith(
      outputs.pageViewCall.method,
      ...outputs.pageViewCall.args,
    );
  });

  test('purchase produces correct output', () => {
    const mockSdk = jest.fn();
    const context = createPushContext({
      env: {
        window: { vendorSdk: mockSdk } as unknown as Window,
        document: {} as Document,
      },
      data: {
        transaction_id: 'T-123',
        value: 99.99,
        currency: 'USD',
        items: [{ item_id: 'P-1', item_name: 'Widget', price: 99.99 }],
      },
    });

    destinationVendor.push(events.purchase, context);

    expect(mockSdk).toHaveBeenCalledWith(
      outputs.purchaseCall.method,
      ...outputs.purchaseCall.args,
    );
  });

  test('custom event produces correct output', () => {
    const mockSdk = jest.fn();
    const context = createPushContext({
      env: {
        window: { vendorSdk: mockSdk } as unknown as Window,
        document: {} as Document,
      },
      data: { button_id: 'cta', button_text: 'Sign Up' },
    });

    destinationVendor.push(events.buttonClick, context);

    expect(mockSdk).toHaveBeenCalledWith(
      outputs.customEventCall.method,
      ...outputs.customEventCall.args,
    );
  });
});
