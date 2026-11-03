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
          accountId: '123-456-7890',
          accountType: 'GOOGLE_ADS',
        },
        productDestinationId: 'AW-CONVERSION-123',
      },
    ],
  },
};
