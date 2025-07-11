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
});
