import type { Env } from '../types';

/**
 * Example environment configurations for GCP Cloud Function source
 *
 * These environments provide standardized mock structures for testing
 * HTTP request handling without requiring actual cloud function deployment.
 */

/**
 * Standard mock environment for testing cloud function source
 *
 * Use this for testing HTTP event ingestion and request/response handling
 * without requiring a real GCP Cloud Function environment.
 */
export const push: Env = {
  elb: jest.fn(),
};
