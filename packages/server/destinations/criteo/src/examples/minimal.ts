import type { Flow } from '@walkeros/core';

/**
 * The settings Criteo needs to deliver: the partner ID and the caller ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { partnerId: '12345', callerId: 'CALLER_ID' },
};
