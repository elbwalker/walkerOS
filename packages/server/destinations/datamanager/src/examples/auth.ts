import type { DestinationDataManager } from '..';

/**
 * AWS Lambda / Serverless Configuration
 * Uses inline credentials from environment variables
 * Best for: AWS Lambda, Docker, Kubernetes, any serverless environment
 */
export const awsLambda: DestinationDataManager.Config = {
  settings: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
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
 * GCP Cloud Functions / Cloud Run Configuration
 * Uses Application Default Credentials (ADC) - no explicit auth config needed
 * Best for: Google Cloud Functions, Cloud Run, GCE, GKE
 */
export const gcpCloudFunctions: DestinationDataManager.Config = {
  settings: {
    // No auth config needed - ADC works automatically on GCP!
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
 * Local Development Configuration
 * Uses service account JSON file
 * Best for: Local development, testing
 */
export const localDevelopment: DestinationDataManager.Config = {
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
  },
};

/**
 * Docker / Kubernetes Configuration
 * Uses ADC via GOOGLE_APPLICATION_CREDENTIALS environment variable
 * Best for: Docker containers, Kubernetes pods
 *
 * Setup:
 * 1. Mount service account JSON as secret/configmap
 * 2. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 * 3. ADC will automatically use it
 */
export const dockerKubernetes: DestinationDataManager.Config = {
  settings: {
    // No explicit config - ADC uses GOOGLE_APPLICATION_CREDENTIALS env var
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
 * Custom Scopes Configuration
 * For specific use cases requiring different OAuth scopes
 */
export const customScopes: DestinationDataManager.Config = {
  settings: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/datamanager'],
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
