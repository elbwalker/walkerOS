import type { Flow } from '@walkeros/core';

/**
 * The settings RudderStack needs to deliver: the write key, read from the
 * environment, and the data plane URL.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    writeKey: 'test-write-key',
    dataPlaneUrl: 'https://hosted.rudderlabs.com',
  },
  secrets: { writeKey: 'RUDDERSTACK_WRITE_KEY' },
};
