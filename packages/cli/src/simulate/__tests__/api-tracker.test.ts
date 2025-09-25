import { createApiTracker, type ApiCall } from '../api-tracker';

describe('API Tracker', () => {
  it('should track typical gtag usage patterns', () => {
    const calls: ApiCall[] = [];
    const logCall = (call: ApiCall) => calls.push(call);
    const mockWindow = {} as {
      gtag: (...args: unknown[]) => void;
      dataLayer: unknown[] & { push: (...args: unknown[]) => void };
    };
    const window = createApiTracker(mockWindow, logCall);

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

  it('should filter operations based on path patterns', () => {
    const calls: ApiCall[] = [];
    const logCall = (call: ApiCall) => calls.push(call);
    const mock = {} as any;
    const tracker = createApiTracker(mock, logCall, [
      'call:foo',
      'get:bar',
      'baz',
    ]);

    // These should be logged

    // call:foo - matches
    tracker.foo();
    expect(calls).toContainEqual({
      type: 'call',
      path: 'foo',
      args: [],
      timestamp: expect.any(Number),
    });

    // get:bar - matches
    tracker.bar;
    expect(calls).toContainEqual({
      type: 'get',
      path: 'bar',
      timestamp: expect.any(Number),
    });

    // call:baz - matches (this will also log get:baz first)
    tracker.baz();
    expect(calls).toContainEqual({
      type: 'get',
      path: 'baz',
      timestamp: expect.any(Number),
    });
    expect(calls).toContainEqual({
      type: 'call',
      path: 'baz',
      args: [],
      timestamp: expect.any(Number),
    });

    // set:baz - matches (baz pattern matches all ops)
    tracker.baz = 'test';
    expect(calls).toContainEqual({
      type: 'set',
      path: 'baz',
      value: 'test',
      timestamp: expect.any(Number),
    });

    expect(calls).toHaveLength(5);

    // These should NOT be logged

    // get:foo - doesn't match call:foo
    tracker.foo;
    // set:bar - doesn't match get:bar
    tracker.bar = 'test';
    // call:other - no pattern matches
    tracker.other();
    // set:other - no pattern matches
    tracker.other = 'test';
    expect(calls).toHaveLength(5);
  });
});
