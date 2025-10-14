import type { Source } from '@walkeros/core';

/**
 * Example environment configurations for dataLayer source
 *
 * These environments provide standardized mock structures for testing
 * dataLayer interception without requiring a real window object.
 */

/**
 * Environment interface for dataLayer source
 */
interface DataLayerEnv extends Source.Env {
  window?: typeof window;
}

/**
 * Mock window object with dataLayer array
 */
const createMockWindow = () => ({
  dataLayer: [] as unknown[],
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
});

/**
 * Standard mock environment for testing dataLayer source
 *
 * Use this for testing dataLayer.push interception and event transformation
 * without requiring a real browser environment.
 */
export const push: DataLayerEnv = {
  get push() {
    return jest.fn();
  },
  get command() {
    return jest.fn();
  },
  get elb() {
    return jest.fn();
  },
  get window() {
    return createMockWindow() as unknown as typeof window;
  },
};
