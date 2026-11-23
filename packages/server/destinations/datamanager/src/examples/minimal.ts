import type { Flow } from '@walkeros/core';

/**
 * The setting the Data Manager API needs to deliver: one destination
 * account with its conversion action. Authentication comes from the
 * environment's Google credentials.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    destinations: [
      {
        operatingAccount: {
          accountId: '1234567890',
          accountType: 'GOOGLE_ADS',
        },
        productDestinationId: '987654321',
      },
    ],
  },
};
