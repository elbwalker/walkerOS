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

    global.IntersectionObserver = jest.fn(() => mockObserver) as any;

    // Create mock collector
    mockCollector = {
      config: { listeners: true },
      push: jest.fn(),
    } as any;
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
    const collector2 = { config: { listeners: true }, push: jest.fn() } as any;

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
    delete (global as any).IntersectionObserver;

    expect(() => initVisibilityTracking(mockCollector, 1000)).not.toThrow();

    const element = document.createElement('div');
    expect(() => triggerVisible(mockCollector, element)).not.toThrow();

    // Restore
    global.IntersectionObserver = originalIO;
  });
});
