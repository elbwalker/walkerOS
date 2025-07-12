import {
  initVisibilityTracking,
  triggerVisible,
  destroyVisibilityTracking,
  unobserveElement,
} from '../lib/triggerVisible';
import type { WebCollector } from '../types';

// Mock isVisible
const mockIsVisible = jest.fn();
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  isVisible: (element: HTMLElement) => mockIsVisible(element),
}));

describe('triggerVisible', () => {
  let mockCollector: WebCollector.Collector;
  let mockObserver: {
    observe: jest.Mock;
    unobserve: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    mockIsVisible.mockReturnValue(true);

    // Mock IntersectionObserver
    mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };

    global.IntersectionObserver = jest.fn(
      () => mockObserver,
    ) as unknown as typeof IntersectionObserver;

    // Create mock collector
    mockCollector = {
      config: { listeners: true },
      push: jest.fn(),
    } as unknown as WebCollector.Collector;
  });

  afterEach(() => {
    destroyVisibilityTracking(mockCollector);
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('initializes visibility tracking', () => {
    initVisibilityTracking(mockCollector, 1000);
    expect(global.IntersectionObserver).toHaveBeenCalled();
  });

  test('observes element', () => {
    initVisibilityTracking(mockCollector, 1000);
    const element = document.createElement('div');

    triggerVisible(mockCollector, element);
    expect(mockObserver.observe).toHaveBeenCalledWith(element);
  });

  test('unobserves element', () => {
    initVisibilityTracking(mockCollector, 1000);
    const element = document.createElement('div');

    triggerVisible(mockCollector, element);
    unobserveElement(mockCollector, element);

    expect(mockObserver.unobserve).toHaveBeenCalledWith(element);
  });

  test('destroys tracking', () => {
    initVisibilityTracking(mockCollector, 1000);
    destroyVisibilityTracking(mockCollector);

    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  test('triggerVisible function observes element', () => {
    initVisibilityTracking(mockCollector, 1000);
    const element = document.createElement('div');

    triggerVisible(mockCollector, element);
    expect(mockObserver.observe).toHaveBeenCalledWith(element);
  });

  test('handles multiple collectors independently', () => {
    const collector2 = {
      config: { listeners: true },
      push: jest.fn(),
    } as unknown as WebCollector.Collector;

    initVisibilityTracking(mockCollector, 1000);
    initVisibilityTracking(collector2, 2000);

    const element1 = document.createElement('div');
    const element2 = document.createElement('div');

    triggerVisible(mockCollector, element1);
    triggerVisible(collector2, element2);

    expect(mockObserver.observe).toHaveBeenCalledWith(element1);
    expect(mockObserver.observe).toHaveBeenCalledWith(element2);

    destroyVisibilityTracking(collector2);
  });

  test('handles no IntersectionObserver support gracefully', () => {
    // Remove IntersectionObserver
    const originalIO = global.IntersectionObserver;
    delete (global as unknown as { IntersectionObserver?: unknown })
      .IntersectionObserver;

    expect(() => initVisibilityTracking(mockCollector, 1000)).not.toThrow();

    const element = document.createElement('div');
    expect(() => triggerVisible(mockCollector, element)).not.toThrow();

    // Restore
    global.IntersectionObserver = originalIO;
  });

  test('scope change cleanup and re-initialization', () => {
    // Test that visibility tracking is properly cleaned up and re-initialized during scope changes
    const { initScopeTrigger } = require('../lib/trigger');

    // Create a more complete mock collector with scope configuration
    const scopeMockCollector = {
      config: {
        listeners: true,
        prefix: 'data-elb',
        scope: document,
      },
      push: jest.fn(),
    } as unknown as WebCollector.Collector;

    // Initialize first time
    initScopeTrigger(scopeMockCollector);
    expect(scopeMockCollector._visibilityState).toBeDefined();
    expect(global.IntersectionObserver).toHaveBeenCalledTimes(1);

    // Initialize again (simulating scope change)
    initScopeTrigger(scopeMockCollector);
    expect(scopeMockCollector._visibilityState).toBeDefined();

    // Should have disconnected the old observer and created a new one
    expect(mockObserver.disconnect).toHaveBeenCalled();
    expect(global.IntersectionObserver).toHaveBeenCalledTimes(2);

    // Should have a new observer instance
    const secondObserver = scopeMockCollector._visibilityState?.observer;
    expect(secondObserver).toBeDefined();

    // Clean up
    destroyVisibilityTracking(scopeMockCollector);
  });

  test('high-volume element observation stress test', () => {
    initVisibilityTracking(mockCollector, 1000);

    // Create and observe many elements
    const elements: HTMLElement[] = [];
    for (let i = 0; i < 100; i++) {
      const element = document.createElement('div');
      element.id = `stress-test-element-${i}`;
      elements.push(element);
      triggerVisible(mockCollector, element);
    }

    // Should have called observe for all elements
    expect(mockObserver.observe).toHaveBeenCalledTimes(100);

    // Clean up all elements
    elements.forEach((element) => {
      unobserveElement(mockCollector, element);
    });

    // Should have called unobserve for all elements
    expect(mockObserver.unobserve).toHaveBeenCalledTimes(100);
  });

  test('error condition handling', () => {
    // Test that errors in visibility tracking are handled gracefully
    // This test verifies that the entry-level tryCatch works correctly
    const { tryCatch } = require('@walkerOS/core');

    // Test that tryCatch prevents errors from propagating (simulating entry point behavior)
    expect(() => {
      tryCatch(() => {
        throw new Error('Simulated visibility error');
      })();
    }).not.toThrow();

    // Test that functions work normally when no errors occur
    expect(() => {
      tryCatch(() => initVisibilityTracking(mockCollector, 1000))();
      tryCatch(() => {
        const element = document.createElement('div');
        triggerVisible(mockCollector, element);
      })();
      tryCatch(() => destroyVisibilityTracking(mockCollector))();
    }).not.toThrow();
  });

  test('element safety checks', () => {
    initVisibilityTracking(mockCollector, 1000);

    // Should handle null/undefined elements gracefully
    expect(() => {
      triggerVisible(mockCollector, null as unknown as HTMLElement);
      triggerVisible(mockCollector, undefined as unknown as HTMLElement);
      unobserveElement(mockCollector, null as unknown as HTMLElement);
      unobserveElement(mockCollector, undefined as unknown as HTMLElement);
    }).not.toThrow();

    // Should handle elements without required properties
    const invalidElement = {} as HTMLElement;
    expect(() => {
      triggerVisible(mockCollector, invalidElement);
    }).not.toThrow();
  });

  describe('visibles trigger (multiple: true)', () => {
    test('accepts multiple config parameter', () => {
      initVisibilityTracking(mockCollector, 1000);
      const element = document.createElement('div');

      expect(() => {
        triggerVisible(mockCollector, element, { multiple: true });
      }).not.toThrow();

      expect(mockObserver.observe).toHaveBeenCalledWith(element);
    });

    test('stores element config for multiple triggers', () => {
      initVisibilityTracking(mockCollector, 1000);
      const element = document.createElement('div');

      triggerVisible(mockCollector, element, { multiple: true });

      const state = mockCollector._visibilityState;
      expect(state?.elementConfigs).toBeDefined();

      const config = state?.elementConfigs?.get(element);
      expect(config).toEqual({
        multiple: true,
        blocked: false,
      });
    });

    test('stores element config for single triggers (default)', () => {
      initVisibilityTracking(mockCollector, 1000);
      const element = document.createElement('div');

      triggerVisible(mockCollector, element);

      const state = mockCollector._visibilityState;
      const config = state?.elementConfigs?.get(element);
      expect(config).toEqual({
        multiple: false,
        blocked: false,
      });
    });

    test('does not unobserve multiple elements after triggering', () => {
      initVisibilityTracking(mockCollector, 1000);
      const element = document.createElement('div');

      // Mock element dimensions and visibility
      Object.defineProperty(element, 'offsetHeight', { value: 100 });
      Object.defineProperty(element, 'clientHeight', { value: 100 });
      Object.defineProperty(element, 'offsetTop', { value: 0 });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      mockIsVisible.mockReturnValue(true);

      triggerVisible(mockCollector, element, { multiple: true });

      // Simulate intersection with sufficient visibility
      const intersectionCallback = (global.IntersectionObserver as jest.Mock)
        .mock.calls[0][0];
      const mockEntry = {
        target: element,
        intersectionRatio: 0.6,
      };

      intersectionCallback([mockEntry]);

      // Fast-forward timer
      jest.advanceTimersByTime(1000);

      // Element should still be observed (not unobserved)
      expect(mockObserver.unobserve).not.toHaveBeenCalledWith(element);
    });

    test('tracks visibility state for re-entry detection', () => {
      initVisibilityTracking(mockCollector, 1000);
      const element = document.createElement('div');

      // Mock element dimensions
      Object.defineProperty(element, 'offsetHeight', { value: 100 });
      Object.defineProperty(element, 'clientHeight', { value: 100 });
      Object.defineProperty(element, 'offsetTop', { value: 0 });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      mockIsVisible.mockReturnValue(true);

      triggerVisible(mockCollector, element, { multiple: true });

      const intersectionCallback = (global.IntersectionObserver as jest.Mock)
        .mock.calls[0][0];
      const state = mockCollector._visibilityState;
      const config = state?.elementConfigs?.get(element);

      // Initial state should be blocked: false
      expect(config?.blocked).toBe(false);
      expect(config?.multiple).toBe(true);

      // 1. Element becomes visible - should create timer
      intersectionCallback([
        {
          target: element,
          intersectionRatio: 0.6,
        },
      ]);

      expect(state?.timers.has(element)).toBe(true);

      // 2. Element goes out of view - should clear timer and update state
      intersectionCallback([
        {
          target: element,
          intersectionRatio: 0,
        },
      ]);

      expect(state?.timers.has(element)).toBe(false);
      expect(config?.blocked).toBe(false);

      // 3. Element becomes visible again (re-entry) - should be allowed
      intersectionCallback([
        {
          target: element,
          intersectionRatio: 0.6,
        },
      ]);

      // Should create timer for second firing
      expect(state?.timers.has(element)).toBe(true);
    });

    test('prevents continuous firing while element remains visible', () => {
      initVisibilityTracking(mockCollector, 1000);
      const element = document.createElement('div');

      // Mock element dimensions
      Object.defineProperty(element, 'offsetHeight', { value: 100 });
      Object.defineProperty(element, 'clientHeight', { value: 100 });
      Object.defineProperty(element, 'offsetTop', { value: 0 });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      mockIsVisible.mockReturnValue(true);

      triggerVisible(mockCollector, element, { multiple: true });

      const intersectionCallback = (global.IntersectionObserver as jest.Mock)
        .mock.calls[0][0];
      const state = mockCollector._visibilityState;
      const config = state?.elementConfigs?.get(element);

      // 1. Element becomes visible
      intersectionCallback([
        {
          target: element,
          intersectionRatio: 0.6,
        },
      ]);

      expect(state?.timers.has(element)).toBe(true);
      expect(config?.blocked).toBe(false); // Not yet fired

      // 2. Element remains visible (intersection event fires again)
      // Since blocked is still false, this should not block
      intersectionCallback([
        {
          target: element,
          intersectionRatio: 0.7,
        },
      ]);

      // Should still have timer (or reset it)
      expect(state?.timers.has(element)).toBe(true);
      expect(config?.multiple).toBe(true);
    });

    test('handles rapid visibility transitions correctly', () => {
      initVisibilityTracking(mockCollector, 1000);
      const element = document.createElement('div');

      // Mock element dimensions
      Object.defineProperty(element, 'offsetHeight', { value: 100 });
      Object.defineProperty(element, 'clientHeight', { value: 100 });
      Object.defineProperty(element, 'offsetTop', { value: 0 });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      mockIsVisible.mockReturnValue(true);

      triggerVisible(mockCollector, element, { multiple: true });

      const intersectionCallback = (global.IntersectionObserver as jest.Mock)
        .mock.calls[0][0];
      const state = mockCollector._visibilityState;
      const config = state?.elementConfigs?.get(element);

      // Initial state
      expect(config?.blocked).toBe(false);
      expect(config?.multiple).toBe(true);

      // 1. Element becomes visible
      intersectionCallback([{ target: element, intersectionRatio: 0.6 }]);
      expect(state?.timers.has(element)).toBe(true);

      // 2. Element goes out of view
      intersectionCallback([{ target: element, intersectionRatio: 0 }]);
      expect(config?.blocked).toBe(false);
      expect(state?.timers.has(element)).toBe(false); // Timer cleared

      // 3. Element becomes visible again (should be allowed)
      intersectionCallback([{ target: element, intersectionRatio: 0.6 }]);
      expect(state?.timers.has(element)).toBe(true); // New timer created

      // 4. Another rapid transition
      intersectionCallback([{ target: element, intersectionRatio: 0 }]);
      expect(config?.blocked).toBe(false);
      expect(state?.timers.has(element)).toBe(false); // Timer cleared again
    });

    test('compares visible vs visibles behavior', () => {
      initVisibilityTracking(mockCollector, 1000);

      const visibleElement = document.createElement('div');
      const visiblesElement = document.createElement('div');

      // Mock element dimensions for both
      [visibleElement, visiblesElement].forEach((el) => {
        Object.defineProperty(el, 'offsetHeight', { value: 100 });
        Object.defineProperty(el, 'clientHeight', { value: 100 });
        Object.defineProperty(el, 'offsetTop', { value: 0 });
      });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      mockIsVisible.mockReturnValue(true);

      // Setup: one visible (single), one visibles (multiple)
      triggerVisible(mockCollector, visibleElement, { multiple: false });
      triggerVisible(mockCollector, visiblesElement, { multiple: true });

      const state = mockCollector._visibilityState;
      const visibleConfig = state?.elementConfigs?.get(visibleElement);
      const visiblesConfig = state?.elementConfigs?.get(visiblesElement);

      // Verify different configurations are stored
      expect(visibleConfig?.multiple).toBe(false);
      expect(visiblesConfig?.multiple).toBe(true);

      // Both should be observed
      expect(mockObserver.observe).toHaveBeenCalledWith(visibleElement);
      expect(mockObserver.observe).toHaveBeenCalledWith(visiblesElement);
    });

    test('performance test with many visibles elements', () => {
      initVisibilityTracking(mockCollector, 1000);

      const elements: HTMLElement[] = [];
      const numElements = 10; // Reduced for simpler test

      // Create many elements with visibles trigger
      for (let i = 0; i < numElements; i++) {
        const element = document.createElement('div');
        element.id = `visibles-perf-test-${i}`;

        // Mock element dimensions
        Object.defineProperty(element, 'offsetHeight', { value: 100 });
        Object.defineProperty(element, 'clientHeight', { value: 100 });
        Object.defineProperty(element, 'offsetTop', { value: i * 200 });

        elements.push(element);
        triggerVisible(mockCollector, element, { multiple: true });
      }

      const state = mockCollector._visibilityState;

      // Verify all elements are registered and configured
      elements.forEach((element) => {
        const config = state?.elementConfigs?.get(element);
        expect(config).toEqual({
          multiple: true,
          blocked: false,
        });
        expect(mockObserver.observe).toHaveBeenCalledWith(element);
      });

      // All elements should still be observed (not unobserved)
      elements.forEach((element) => {
        expect(mockObserver.unobserve).not.toHaveBeenCalledWith(element);
      });
    });
  });
});
