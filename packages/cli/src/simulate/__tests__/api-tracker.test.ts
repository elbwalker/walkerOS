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

    // 1. Check if gtag exists (no logging for get operations)
    window.gtag;

    // 2. Set gtag function
    window.gtag = () => {};
    expect(calls).toContainEqual({
      type: 'set',
      path: 'gtag',
      value: expect.any(Function),
      timestamp: expect.any(Number),
    });

    // 3. Check dataLayer (no logging for get operations)
    window.dataLayer;

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

    // Only 3 operations should be logged: 2 sets + 1 call
    expect(calls).toHaveLength(3);
  });

  it('should filter operations based on path patterns', () => {
    const calls: ApiCall[] = [];
    const logCall = (call: ApiCall) => calls.push(call);
    const mock = {} as any;
    const tracker = createApiTracker(mock, logCall, [
      'call:foo',
      'set:bar',
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

    // set:bar - matches
    tracker.bar = 'test';
    expect(calls).toContainEqual({
      type: 'set',
      path: 'bar',
      value: 'test',
      timestamp: expect.any(Number),
    });

    // call:baz - matches (baz pattern matches all ops)
    tracker.baz();
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

    expect(calls).toHaveLength(4);

    // These should NOT be logged

    // get operations are never logged now
    tracker.foo;
    tracker.bar;
    // call:other - no pattern matches
    tracker.other();
    // set:other - no pattern matches
    tracker.other = 'test';
    expect(calls).toHaveLength(4);
  });

  it('should support wildcard type filtering', () => {
    const calls: ApiCall[] = [];
    const logCall = (call: ApiCall) => calls.push(call);
    const mock = {} as any;
    const tracker = createApiTracker(mock, logCall, ['call:*', 'set:config']);

    // These should be logged - all function calls
    tracker.foo();
    tracker.bar();
    tracker.baz();

    // This should be logged - specific set on config
    tracker.config = { key: 'value' };

    // These should NOT be logged
    tracker.foo; // get operations are never logged
    tracker.bar = 'test'; // set:bar - doesn't match set:config
    tracker.other; // get operations are never logged

    // Verify only matching operations were logged
    expect(calls).toHaveLength(4); // 3 call:* + 1 set:config

    // Check all function calls were logged
    expect(calls).toContainEqual({
      type: 'call',
      path: 'foo',
      args: [],
      timestamp: expect.any(Number),
    });
    expect(calls).toContainEqual({
      type: 'call',
      path: 'bar',
      args: [],
      timestamp: expect.any(Number),
    });
    expect(calls).toContainEqual({
      type: 'call',
      path: 'baz',
      args: [],
      timestamp: expect.any(Number),
    });

    // Check config set was logged
    expect(calls).toContainEqual({
      type: 'set',
      path: 'config',
      value: { key: 'value' },
      timestamp: expect.any(Number),
    });
  });

  it('should only log final operations in property chains', () => {
    const calls: ApiCall[] = [];
    const logCall = (call: ApiCall) => calls.push(call);
    const mock = {} as any;
    const tracker = createApiTracker(mock, logCall);

    // Deep property chain with function call - should only log the final call
    tracker.foo.bar.baz();

    // Deep property chain with assignment - should only log the final set
    tracker.foo.bar.config = 'value';

    // Simple property access - should not log anything
    void tracker.foo.bar.something;

    // Verify only final operations were logged
    expect(calls).toHaveLength(2);
    expect(calls).toContainEqual({
      type: 'call',
      path: 'foo.bar.baz',
      args: [],
      timestamp: expect.any(Number),
    });
    expect(calls).toContainEqual({
      type: 'set',
      path: 'foo.bar.config',
      value: 'value',
      timestamp: expect.any(Number),
    });
  });
});
