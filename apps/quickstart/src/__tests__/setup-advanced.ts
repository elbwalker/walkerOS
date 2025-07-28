// Setup file for advanced examples tests

// Mock DOM environment
const mockElement = {
  src: '',
  async: false,
  onload: null as (() => void) | null,
};

const mockDocument = {
  createElement: jest.fn().mockReturnValue(mockElement),
  head: {
    appendChild: jest.fn(),
  },
  referrer: 'https://google.com',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockWindow = {
  location: {
    hostname: 'example.com',
  },
  elb: jest.fn(),
};

const mockNavigator = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

const mockPerformance = {
  timing: {
    navigationStart: 1000,
    loadEventEnd: 2000,
    domContentLoadedEventEnd: 1500,
  },
  getEntriesByType: jest
    .fn()
    .mockReturnValue([{ name: 'first-contentful-paint', startTime: 800 }]),
  now: jest.fn().mockReturnValue(1000),
};

// Mock fetch
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ success: true }),
});

// Apply mocks to global
Object.defineProperty(global, 'document', { value: mockDocument });
Object.defineProperty(global, 'window', { value: mockWindow });
Object.defineProperty(global, 'navigator', { value: mockNavigator });
Object.defineProperty(global, 'performance', { value: mockPerformance });
Object.defineProperty(global, 'fetch', { value: mockFetch });

export {
  mockElement,
  mockDocument,
  mockWindow,
  mockNavigator,
  mockPerformance,
  mockFetch,
};
