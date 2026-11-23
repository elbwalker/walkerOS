import type { Flow } from '@walkeros/core';

/**
 * The settings GA4 needs to deliver: the measurement id and the Measurement
 * Protocol API secret, read from the environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { measurementId: 'G-TEST123', apiSecret: 's3cr3t' },
  secrets: { apiSecret: 'GA4_API_SECRET' },
};
