import type { Env } from '../types';
import type { Elb } from '@walkeros/core';

/**
 * Example environment configurations for browser source
 *
 * These environments provide standardized mock structures for testing
 * browser event capture without requiring an actual DOM environment.
 */

// Simple no-op function for mocking
const noop = () => {};

// Create a properly typed elb/push/command function that returns a promise with PushResult
const createMockElbFn = (): Elb.Fn => {
  const fn = (() =>
    Promise.resolve({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    })) as Elb.Fn;
  return fn;
};

/**
 * Mock window object with common browser APIs
 */
const createMockWindow = () => ({
  addEventListener: noop,
  removeEventListener: noop,
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
});

/**
 * Mock document object with DOM methods
 */
const createMockDocument = () => ({
  addEventListener: noop,
  removeEventListener: noop,
  querySelector: noop,
  querySelectorAll: () => [],
  getElementById: noop,
  getElementsByClassName: () => [],
  getElementsByTagName: () => [],
  createElement: () => ({
    setAttribute: noop,
    getAttribute: noop,
    addEventListener: noop,
    removeEventListener: noop,
  }),
  body: {
    appendChild: noop,
    removeChild: noop,
  },
  documentElement: {
    scrollTop: 0,
    scrollLeft: 0,
  },
  readyState: 'complete',
  title: 'Test Page',
  referrer: '',
  cookie: '',
});

/**
 * Standard mock environment for testing browser source
 *
 * Use this for testing event capture, DOM interactions, and pageview tracking
 * without requiring a real browser environment.
 */
export const push: Env = {
  get push() {
    return createMockElbFn();
  },
  get command() {
    return createMockElbFn();
  },
  get elb() {
    return createMockElbFn();
  },
  get window() {
    return createMockWindow() as unknown as typeof window;
  },
  get document() {
    return createMockDocument() as unknown as typeof document;
  },
};
