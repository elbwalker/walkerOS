// Browser environment setup for walker.js tests
// Based on @walkerOS/jest/web.setup.ts

const mockDataLayer = jest.fn();

global.beforeEach(() => {
  jest.useFakeTimers();

  // Mocks
  jest.clearAllMocks();
  jest.resetModules();

  // Reset DOM with event listeners etc.
  document.getElementsByTagName('html')[0].innerHTML = '';
  document.body = document.body.cloneNode() as HTMLElement;

  // elbLayer and dataLayer
  const w = window as unknown as Record<string, unknown | unknown[]>;
  w.elbLayer = undefined;
  w.dataLayer = [];
  (w.dataLayer as unknown[]).push = mockDataLayer;

  // Performance API - mock the method that was causing test failures
  global.performance.getEntriesByType = jest
    .fn()
    .mockReturnValue([{ type: 'navigate' }]);

  // Mock IntersectionObserver - required for sourceBrowser visibility tracking
  global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver - might be needed for responsive tracking
  global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock MutationObserver - needed for DOM change detection
  global.MutationObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(),
  }));

  // Other browser APIs that might be needed
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'localhost',
      pathname: '/',
      search: '',
      hash: '',
      href: 'http://localhost:3000/',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      port: '3000',
    },
    writable: true,
  });

  // Mock document.currentScript for auto-init tests
  Object.defineProperty(document, 'currentScript', {
    value: null,
    writable: true,
  });

  // Mock document properties
  Object.defineProperty(document, 'title', {
    value: 'Test Page',
    writable: true,
  });

  Object.defineProperty(document, 'referrer', {
    value: '',
    writable: true,
  });

  Object.defineProperty(document, 'readyState', {
    value: 'complete',
    writable: true,
  });

  // Mock navigator
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Node.js jsdom test environment)',
      language: 'en-US',
      platform: 'linux',
    },
    writable: true,
  });

  // Mock screen
  Object.defineProperty(window, 'screen', {
    value: {
      width: 1920,
      height: 1080,
    },
    writable: true,
  });

  // Mock element positioning methods - required for visibility detection
  Element.prototype.getBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    toJSON: jest.fn(),
  }));

  // Mock element offset properties
  Object.defineProperties(Element.prototype, {
    offsetTop: { get: () => 0, configurable: true },
    offsetLeft: { get: () => 0, configurable: true },
    offsetWidth: { get: () => 100, configurable: true },
    offsetHeight: { get: () => 100, configurable: true },
    clientWidth: { get: () => 100, configurable: true },
    clientHeight: { get: () => 100, configurable: true },
  });

  // Mock getComputedStyle - required for element styling calculations
  global.getComputedStyle = jest.fn().mockImplementation(() => ({
    getPropertyValue: jest.fn().mockReturnValue(''),
    width: '100px',
    height: '100px',
    display: 'block',
    visibility: 'visible',
  }));

  // Mock matchMedia - might be needed for responsive features
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock localStorage and sessionStorage - required for browser source
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0,
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: mockStorage,
    writable: true,
  });

  // Mock requestAnimationFrame and cancelAnimationFrame
  global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
  global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

  // Mock requestIdleCallback if it exists
  if (typeof global.requestIdleCallback === 'undefined') {
    global.requestIdleCallback = jest.fn((cb) => setTimeout(cb, 0));
    global.cancelIdleCallback = jest.fn((id) => clearTimeout(id));
  }
});

global.afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

export { mockDataLayer };
