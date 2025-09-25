import { createApiTracker, type ApiCall } from '../api-tracker';

describe('API Tracker', () => {
  it('should track typical gtag usage patterns', () => {
    const calls: ApiCall[] = [];
    const mockWindow = {} as {
      gtag: (...args: unknown[]) => void;
      dataLayer: unknown[] & { push: (...args: unknown[]) => void };
    };
    const window = createApiTracker(mockWindow, (call) => calls.push(call));

    // Simulate typical gtag initialization and usage

    // 1. Check if gtag exists
    window.gtag;
    expect(calls).toContainEqual({
      type: 'get',
      path: 'gtag',
      timestamp: expect.any(Number),
    });

    // 2. Set gtag function
    window.gtag = () => {};
    expect(calls).toContainEqual({
      type: 'set',
      path: 'gtag',
      value: expect.any(Function),
      timestamp: expect.any(Number),
    });

    // 3. Check dataLayer
    window.dataLayer;
    expect(calls).toContainEqual({
      type: 'get',
      path: 'dataLayer',
      timestamp: expect.any(Number),
    });

    // 4. Set dataLayer array (create empty array first)
    const emptyArray: unknown[] = [];
    window.dataLayer = emptyArray;
    expect(calls).toContainEqual({
      type: 'set',
      path: 'dataLayer',
      value: emptyArray,
      timestamp: expect.any(Number),
    });

    // 5. Call gtag function
    window.gtag('event', 'purchase', { transaction_id: '12345', value: 99.99 });
    expect(calls).toContainEqual({
      type: 'call',
      path: 'gtag',
      args: ['event', 'purchase', { transaction_id: '12345', value: 99.99 }],
      timestamp: expect.any(Number),
    });
  });
});
