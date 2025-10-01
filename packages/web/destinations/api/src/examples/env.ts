import type { Environment } from '../types';

/**
 * Example environment configurations for API destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

export const init: Environment | undefined = {
  // Environment before initialization (sendWeb not configured yet)
  sendWeb: undefined,
};

export const standard: Environment = {
  // Standard mock environment for testing
  sendWeb: Object.assign(noop, {
    // Add any specific properties if needed for sendWeb
  }) as unknown as Environment['sendWeb'],
};

// Future: error scenarios (v2)
// export const error: Environment = { ... };
