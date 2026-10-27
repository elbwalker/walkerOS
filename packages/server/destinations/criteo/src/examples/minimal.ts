import type { Flow } from '@walkeros/core';

/**
 * The settings Criteo needs to deliver: the partner ID and the caller ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { partnerId: 'PARTNER_ID', callerId: 'CALLER_ID' },
};
