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
const mockWindow = {
  dataLayer: [] as unknown[],
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

/**
 * Standard mock environment for testing dataLayer source
 *
 * Use this for testing dataLayer.push interception and event transformation
 * without requiring a real browser environment.
 */
export const push: DataLayerEnv = {
  elb: jest.fn(),
  window: mockWindow as unknown as typeof window,
};
