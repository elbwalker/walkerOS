import { destinationVendor } from '.';
import type { Env, VendorSdk } from './types';
import { createMockContext } from '@walkeros/core';
import { events, outputs } from '../../examples';

/**
 * Test template for simple destinations.
 *
 * Key patterns:
 * 1. Use createMockContext() - standardizes context creation with sensible defaults
 * 2. Include id field - required in context
 * 3. Use rule instead of mapping - property renamed in PushContext
 * 4. Use examples for test data - don't hardcode test values
 * 5. Build the mock env cast-free - because the SDK is OPTIONAL on the narrowed
 *    `Env`, `{ window: { vendorSdk } }` satisfies `Env` directly. No
 *    `as unknown as Window` / `as Document` casts anywhere.
 */

describe('destinationVendor', () => {
  let vendorSdk: jest.Mock;
  let env: Env;

  beforeEach(() => {
    jest.clearAllMocks();
    vendorSdk = jest.fn();
    // The jest.Mock is assignable to the SDK call signature, so this needs
    // no cast. Keep a typed reference for the call assertions below.
    const sdk: VendorSdk = vendorSdk;
    env = { window: { vendorSdk: sdk } };
  });

  test('page view produces correct output', () => {
    const context = createMockContext({
      env,
      id: 'test-vendor',
      data: { url: '/home', title: 'Home Page' },
      rule: undefined,
    });

    destinationVendor.push(events.pageView, context);

    // Verify against expected output from examples
    expect(vendorSdk).toHaveBeenCalledWith(
      outputs.pageViewCall.method,
      ...outputs.pageViewCall.args,
    );
  });

  test('purchase produces correct output', () => {
    const context = createMockContext({
      env,
      id: 'test-vendor',
      data: {
        transaction_id: 'T-123',
        value: 99.99,
        currency: 'USD',
        items: [{ item_id: 'P-1', item_name: 'Widget', price: 99.99 }],
      },
      rule: undefined,
    });

    destinationVendor.push(events.purchase, context);

    expect(vendorSdk).toHaveBeenCalledWith(
      outputs.purchaseCall.method,
      ...outputs.purchaseCall.args,
    );
  });

  test('custom event produces correct output', () => {
    const context = createMockContext({
      env,
      id: 'test-vendor',
      data: { button_id: 'cta', button_text: 'Sign Up' },
      rule: undefined,
    });

    destinationVendor.push(events.buttonClick, context);

    expect(vendorSdk).toHaveBeenCalledWith(
      outputs.customEventCall.method,
      ...outputs.customEventCall.args,
    );
  });
});
