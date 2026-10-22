import { destinationVendor } from '.';
import type { Destination } from '@walkeros/core';
import { createMockContext } from '@walkeros/core';
import type { Settings } from './types';
import { events, outputs, env as mockEnv } from '../../examples';

/**
 * Test template for simple destinations.
 *
 * Key patterns:
 * 1. Use createMockContext() - standardizes context creation with sensible defaults
 * 2. Include id field - required in context
 * 3. Use rule instead of mapping - property renamed in PushContext
 * 4. Use examples for test data - don't hardcode test values
 * 5. Await push: it returns a promise and a failure is a rejection
 *
 * The failure contract (a failing send is reported, a silent rule sends
 * nothing, consent reaches the vendor) is proven by conformance.test.ts on a
 * real collector. Do not prove delivery or loss with a mocked collector.
 */

// Helper to create push context for testing
function createPushContext(
  overrides: Partial<Destination.PushContext<Settings>> = {},
) {
  return createMockContext({
    env: mockEnv.push,
    id: 'test-vendor',
    data: {},
    rule: undefined,
    ...overrides,
  });
}

describe('destinationVendor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('page view produces correct output', async () => {
    const mockSdk = jest.fn();
    const context = createPushContext({
      env: {
        window: { vendorSdk: mockSdk },
        document: {},
      },
      data: { url: '/home', title: 'Home Page' },
    });

    await destinationVendor.push(events.pageView, context);

    // Verify against expected output from examples
    expect(mockSdk).toHaveBeenCalledWith(
      outputs.pageViewCall.method,
      ...outputs.pageViewCall.args,
    );
  });

  test('purchase produces correct output', async () => {
    const mockSdk = jest.fn();
    const context = createPushContext({
      env: {
        window: { vendorSdk: mockSdk },
        document: {},
      },
      data: {
        transaction_id: 'T-123',
        value: 99.99,
        currency: 'USD',
        items: [{ item_id: 'P-1', item_name: 'Widget', price: 99.99 }],
      },
    });

    await destinationVendor.push(events.purchase, context);

    expect(mockSdk).toHaveBeenCalledWith(
      outputs.purchaseCall.method,
      ...outputs.purchaseCall.args,
    );
  });

  test('custom event produces correct output', async () => {
    const mockSdk = jest.fn();
    const context = createPushContext({
      env: {
        window: { vendorSdk: mockSdk },
        document: {},
      },
      data: { button_id: 'cta', button_text: 'Sign Up' },
    });

    await destinationVendor.push(events.buttonClick, context);

    expect(mockSdk).toHaveBeenCalledWith(
      outputs.customEventCall.method,
      ...outputs.customEventCall.args,
    );
  });
});
