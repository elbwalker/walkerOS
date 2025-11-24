import type { DestinationDataManager } from '..';

/**
 * Minimal configuration for Google Data Manager with inline credentials
 */
export const minimal: DestinationDataManager.Config = {
  settings: {
    credentials: {
      client_email: 'service-account@project.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
    },
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
    credentials: {
      client_email: 'service-account@project.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
    },
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

    // Guided helpers (apply to all events)
    userData: {
      email: 'user.id',
      phone: 'data.phone',
      firstName: 'data.firstName',
      lastName: 'data.lastName',
    },
    userId: 'user.id',
    clientId: 'user.device',
    sessionAttributes: 'context.sessionAttributes',
  },
  data: {
    map: {
      eventSource: { value: 'WEB' },
    },
  },
};

/**
 * GA4-specific configuration using Application Default Credentials
 */
export const ga4: DestinationDataManager.Config = {
  settings: {
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
 * Debug configuration with logging enabled using keyFilename
 */
export const debug: DestinationDataManager.Config = {
  settings: {
    keyFilename: './service-account.json',
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
