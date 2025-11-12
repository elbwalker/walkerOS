import type { DestinationDataManager } from '..';

/**
 * Minimal configuration for Google Data Manager
 */
export const minimal: DestinationDataManager.Config = {
  settings: {
    accessToken: 'ya29.c.xxx',
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

/**
 * Complete configuration with all options
 */
export const complete: DestinationDataManager.Config = {
  settings: {
    accessToken: 'ya29.c.xxx',
    destinations: [
      {
        operatingAccount: {
          accountId: '123-456-7890',
          accountType: 'GOOGLE_ADS',
        },
        productDestinationId: 'AW-CONVERSION-123',
      },
      {
        operatingAccount: {
          accountId: '987654321',
          accountType: 'GOOGLE_ANALYTICS_PROPERTY',
        },
        productDestinationId: 'G-XXXXXXXXXX',
      },
    ],
    eventSource: 'WEB',
    batchSize: 100,
    batchInterval: 5000,
    validateOnly: false,
    consent: {
      adUserData: 'CONSENT_GRANTED',
      adPersonalization: 'CONSENT_GRANTED',
    },
  },
  data: {
    map: {
      eventSource: { value: 'WEB' },
    },
  },
};

/**
 * GA4-specific configuration
 */
export const ga4: DestinationDataManager.Config = {
  settings: {
    accessToken: 'ya29.c.xxx',
    destinations: [
      {
        operatingAccount: {
          accountId: '123456789',
          accountType: 'GOOGLE_ANALYTICS_PROPERTY',
        },
        productDestinationId: 'G-XXXXXXXXXX',
      },
    ],
    eventSource: 'WEB',
  },
};

/**
 * Debug configuration with logging enabled
 */
export const debug: DestinationDataManager.Config = {
  settings: {
    accessToken: 'ya29.c.xxx',
    destinations: [
      {
        operatingAccount: {
          accountId: '123-456-7890',
          accountType: 'GOOGLE_ADS',
        },
        productDestinationId: 'AW-CONVERSION-123',
      },
    ],
    logLevel: 'debug', // Shows all API calls and responses
  },
};
