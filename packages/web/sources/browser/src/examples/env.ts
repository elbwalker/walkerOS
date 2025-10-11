import type { Env } from '../types';

/**
 * Example environment configurations for browser source
 *
 * These environments provide standardized mock structures for testing
 * browser event capture without requiring an actual DOM environment.
 */

/**
 * Mock window object with common browser APIs
 */
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    href: 'https://example.com/page',
    pathname: '/page',
    search: '?query=test',
    hash: '#section',
    host: 'example.com',
    hostname: 'example.com',
    origin: 'https://example.com',
    protocol: 'https:',
  },
  document: {},
  navigator: {
    language: 'en-US',
    userAgent: 'Mozilla/5.0 (Test)',
  },
  screen: {
    width: 1920,
    height: 1080,
  },
  innerWidth: 1920,
  innerHeight: 1080,
  pageXOffset: 0,
  pageYOffset: 0,
  scrollX: 0,
  scrollY: 0,
};

/**
 * Mock document object with DOM methods
 */
const mockDocument = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(),
  getElementsByClassName: jest.fn(() => []),
  getElementsByTagName: jest.fn(() => []),
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
  documentElement: {
    scrollTop: 0,
    scrollLeft: 0,
  },
  readyState: 'complete',
  title: 'Test Page',
  referrer: '',
  cookie: '',
};

/**
 * Standard mock environment for testing browser source
 *
 * Use this for testing event capture, DOM interactions, and pageview tracking
 * without requiring a real browser environment.
 */
export const push: Env = {
  elb: jest.fn(),
  window: mockWindow as unknown as typeof window,
  document: mockDocument as unknown as typeof document,
};
