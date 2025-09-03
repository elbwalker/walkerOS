import type { WalkerOS, Elb } from '@walkeros/core';
import type { Context } from '../types';
import {
  initVisibilityTracking,
  triggerVisible,
  destroyVisibilityTracking,
  unobserveElement,
} from '../triggerVisible';

// Helper function to create test context
const createTestContext = (prefix = 'data-elb'): Context => ({
  elb: jest.fn() as jest.MockedFunction<Elb.Fn>,
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
  Triggers: { Visible: 'visible' },
}));

const { isVisible } = require('@walkeros/web-core');
const { handleTrigger } = require('../trigger');

describe('triggerVisible', () => {
  let mockObserver: jest.Mocked<IntersectionObserver>;
  let observerCallback: IntersectionObserverCallback;

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
    } as unknown as jest.Mocked<IntersectionObserver>;

    global.IntersectionObserver = jest.fn((callback) => {
      observerCallback = callback;
      return mockObserver;
    }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    destroyVisibilityTracking();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('initVisibilityTracking creates IntersectionObserver', () => {
    initVisibilityTracking(2000);

    expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
      rootMargin: '0px',
      threshold: [0, 0.5],
    });
  });

  test('initVisibilityTracking prevents duplicate initialization', () => {
    initVisibilityTracking(1000);
    const firstCall = (IntersectionObserver as jest.Mock).mock.calls.length;

    initVisibilityTracking(500);
    const secondCall = (IntersectionObserver as jest.Mock).mock.calls.length;

    expect(firstCall).toBe(secondCall);
  });

  test('triggerVisible observes element with correct configuration', () => {
    initVisibilityTracking(500);
    const context = createTestContext();
    const element = document.createElement('div');

    triggerVisible(context, element, { multiple: true });

    expect(mockObserver.observe).toHaveBeenCalledWith(element);
  });

  test('destroyVisibilityTracking disconnects observer and cleans up state', () => {
    initVisibilityTracking(500);

    destroyVisibilityTracking();

    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  test('handles missing IntersectionObserver gracefully', () => {
    const originalIntersectionObserver = global.IntersectionObserver;
    delete (global as unknown as { IntersectionObserver?: unknown })
      .IntersectionObserver;

    expect(() => {
      initVisibilityTracking(1000);
    }).not.toThrow();

    // Restore original IntersectionObserver
    global.IntersectionObserver = originalIntersectionObserver;
  });

  test('unobserveElement cleans up observer and caches', () => {
    initVisibilityTracking(500);
    const element = document.createElement('div');

    unobserveElement(element);

    expect(mockObserver.unobserve).toHaveBeenCalledWith(element);
  });
});
