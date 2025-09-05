import type { WalkerOS, Collector } from '@walkeros/core';
import type { Context } from '../types';
import {
  initVisibilityTracking,
  triggerVisible,
  destroyVisibilityTracking,
  unobserveElement,
} from '../triggerVisible';

// Type for collector with visibility state
interface CollectorWithVisibility extends Collector.Instance {
  _visibilityState?: {
    observer?: IntersectionObserver;
    timers: WeakMap<HTMLElement, number>;
    duration: number;
    elementConfigs?: WeakMap<
      HTMLElement,
      {
        multiple: boolean;
        blocked: boolean;
        context: Context;
        trigger: string;
      }
    >;
  };
}

// Helper function to create test context
const createTestContext = (prefix = 'data-elb'): Context => ({
  collector: {} as Collector.Instance,
  settings: {
    prefix,
    scope: document,
    pageview: false,
    session: false,
    elb: '',
    elbLayer: false,
  },
});

// Mock isVisible
jest.mock('@walkeros/web-core', () => ({
  ...jest.requireActual('@walkeros/web-core'),
  isVisible: jest.fn(),
}));

// Mock handleTrigger
jest.mock('../trigger', () => ({
  ...jest.requireActual('../trigger'),
  handleTrigger: jest.fn(),
  Triggers: { Impression: 'impression', Visible: 'visible' },
}));

// Get references to mocked functions
const { isVisible } = require('@walkeros/web-core');
const { handleTrigger } = require('../trigger');

describe('triggerVisible', () => {
  let mockCollector: Collector.Instance;
  let mockObserver: {
    observe: jest.Mock;
    unobserve: jest.Mock;
    disconnect: jest.Mock;
  };
  let observerCallback: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    (isVisible as jest.Mock).mockReturnValue(true);
    (handleTrigger as jest.Mock).mockResolvedValue([]);

    // Mock IntersectionObserver
    mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };

    global.IntersectionObserver = jest.fn((callback) => {
      observerCallback = callback;
      return mockObserver;
    }) as unknown as typeof IntersectionObserver;

    // Create mock collector
    mockCollector = {
      config: {},
      push: jest.fn(),
      consent: { functional: true },
      session: {},
      destinations: {},
      globals: {},
      hooks: {},
      on: {},
      user: {},
      allowed: true,
    } as unknown as Collector.Instance;
  });

  afterEach(() => {
    destroyVisibilityTracking(mockCollector);
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('initVisibilityTracking creates IntersectionObserver', () => {
    initVisibilityTracking(mockCollector, 2000);

    expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
      rootMargin: '0px',
      threshold: [0, 0.5],
    });

    const state = (mockCollector as CollectorWithVisibility)._visibilityState;
    expect(state).toBeDefined();
    expect(state!.observer).toBe(mockObserver);
    expect(state!.duration).toBe(2000);
    expect(state!.timers).toBeDefined();
  });

  test('initVisibilityTracking does not reinitialize if already initialized', () => {
    initVisibilityTracking(mockCollector, 1000);
    const firstState = (mockCollector as CollectorWithVisibility)
      ._visibilityState;

    initVisibilityTracking(mockCollector, 2000);
    const secondState = (mockCollector as CollectorWithVisibility)
      ._visibilityState;

    expect(firstState).toBe(secondState);
    expect(secondState!.duration).toBe(1000); // Should keep original duration
  });

  test('triggerVisible observes element with correct configuration', () => {
    initVisibilityTracking(mockCollector);

    const element = document.createElement('div');
    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element, { multiple: true });

    expect(mockObserver.observe).toHaveBeenCalledWith(element);

    const state = (mockCollector as CollectorWithVisibility)._visibilityState;
    const elementConfig = state!.elementConfigs!.get(element);
    expect(elementConfig).toEqual({
      multiple: true,
      blocked: false,
      context: expect.any(Object),
      trigger: 'visible',
    });
  });

  test('triggerVisible handles element without observer gracefully', () => {
    // Don't initialize visibility tracking
    const element = document.createElement('div');

    expect(() => {
      const context = createTestContext();
      context.collector = mockCollector;
      triggerVisible(context, element);
    }).not.toThrow();

    expect(mockObserver.observe).not.toHaveBeenCalled();
  });

  test('intersection callback triggers element when visible', async () => {
    initVisibilityTracking(mockCollector, 500);

    const element = document.createElement('div') as HTMLElement;
    Object.defineProperty(element, 'offsetHeight', { value: 100 });
    Object.defineProperty(window, 'innerHeight', { value: 800 });

    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element);

    // Mock intersection entry for visible element
    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0.6, // Above threshold
    };

    observerCallback([entry as IntersectionObserverEntry]);

    // Should set a timer
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);

    // Fast-forward timer
    jest.runAllTimers();

    // Should call handleTrigger
    await Promise.resolve(); // Wait for async
    expect(handleTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        collector: mockCollector,
        settings: expect.objectContaining({
          prefix: 'data-elb',
          scope: expect.any(Object),
          pageview: false,
          session: false,
          elb: '',
          elbLayer: false,
        }),
      }),
      element,
      'impression',
    );
  });

  test('intersection callback handles large elements correctly', async () => {
    initVisibilityTracking(mockCollector, 500);

    const element = document.createElement('div') as HTMLElement;
    Object.defineProperty(element, 'offsetHeight', { value: 1000 }); // Large element
    Object.defineProperty(window, 'innerHeight', { value: 800 });

    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element);

    // Mock intersection entry for large element with low ratio but visible
    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0.3, // Below threshold but large element
    };

    (isVisible as jest.Mock).mockReturnValue(true); // But it's actually visible

    observerCallback([entry as IntersectionObserverEntry]);

    jest.runAllTimers();
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        collector: mockCollector,
        settings: expect.objectContaining({
          prefix: 'data-elb',
          scope: expect.any(Object),
          pageview: false,
          session: false,
          elb: '',
          elbLayer: false,
        }),
      }),
      element,
      'impression',
    );
  });

  test('intersection callback clears timer when element becomes not visible', () => {
    initVisibilityTracking(mockCollector, 500);

    const element = document.createElement('div') as HTMLElement;
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element);

    // First make it visible
    const visibleEntry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0.6,
    };
    observerCallback([visibleEntry as IntersectionObserverEntry]);

    const timerId = jest.mocked(setTimeout).mock.results[0].value;

    // Then make it not visible
    const notVisibleEntry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0, // Not visible
    };
    observerCallback([notVisibleEntry as IntersectionObserverEntry]);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
  });

  test('multiple triggers: blocks re-triggering when element is visible', async () => {
    initVisibilityTracking(mockCollector, 100);

    const element = document.createElement('div') as HTMLElement;
    Object.defineProperty(element, 'offsetHeight', { value: 100 });

    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element, { multiple: true });

    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0.6,
    };

    // First visibility
    observerCallback([entry as IntersectionObserverEntry]);
    jest.runAllTimers();
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(1);

    // Element should now be blocked
    const state = (mockCollector as CollectorWithVisibility)._visibilityState;
    const elementConfig = state!.elementConfigs!.get(element);
    expect(elementConfig!.blocked).toBe(true);

    // Second visibility should not trigger
    observerCallback([entry as IntersectionObserverEntry]);
    jest.runAllTimers();
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(1); // Still only called once
  });

  test('multiple triggers: allows re-triggering after element leaves viewport', async () => {
    initVisibilityTracking(mockCollector, 100);

    const element = document.createElement('div') as HTMLElement;
    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element, { multiple: true });

    const visibleEntry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0.6,
    };
    const notVisibleEntry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0,
    };

    // First visibility and trigger
    observerCallback([visibleEntry as IntersectionObserverEntry]);
    jest.runAllTimers();
    await Promise.resolve();

    // Element leaves viewport
    observerCallback([notVisibleEntry as IntersectionObserverEntry]);

    // Element becomes visible again
    observerCallback([visibleEntry as IntersectionObserverEntry]);
    jest.runAllTimers();
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(2);
  });

  test('unobserveElement cleans up observer, timer, and caches', () => {
    initVisibilityTracking(mockCollector);

    const element = document.createElement('div') as HTMLElement;
    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element);

    // Create a timer
    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0.6,
    };
    observerCallback([entry as IntersectionObserverEntry]);

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    unobserveElement(mockCollector, element);

    expect(mockObserver.unobserve).toHaveBeenCalledWith(element);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test('destroyVisibilityTracking disconnects observer and cleans up state', () => {
    initVisibilityTracking(mockCollector);

    expect(
      (mockCollector as CollectorWithVisibility)._visibilityState,
    ).toBeDefined();

    destroyVisibilityTracking(mockCollector);

    expect(mockObserver.disconnect).toHaveBeenCalled();
    expect(
      (mockCollector as CollectorWithVisibility)._visibilityState,
    ).toBeUndefined();
  });

  test('handles missing IntersectionObserver gracefully', () => {
    // Store original IntersectionObserver and remove it
    const originalIntersectionObserver = global.IntersectionObserver;
    (
      global as unknown as { IntersectionObserver?: unknown }
    ).IntersectionObserver = undefined;

    expect(() => {
      initVisibilityTracking(mockCollector);
    }).not.toThrow();

    const state = (mockCollector as CollectorWithVisibility)._visibilityState;
    expect(state!.observer).toBeUndefined();

    // Restore original IntersectionObserver
    global.IntersectionObserver = originalIntersectionObserver;
  });

  test('caches element size calculations for performance', () => {
    initVisibilityTracking(mockCollector);

    const element = document.createElement('div') as HTMLElement;
    const offsetHeightSpy = jest.spyOn(element, 'offsetHeight', 'get');

    const context = createTestContext();
    context.collector = mockCollector;
    triggerVisible(context, element);

    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      intersectionRatio: 0.3, // Low ratio to trigger size check
    };

    // First check
    observerCallback([entry as IntersectionObserverEntry]);
    const firstCallCount = offsetHeightSpy.mock.calls.length;

    // Second check immediately (should use cache)
    observerCallback([entry as IntersectionObserverEntry]);
    const secondCallCount = offsetHeightSpy.mock.calls.length;

    expect(secondCallCount).toBe(firstCallCount); // Should not have called again due to caching
  });
});
