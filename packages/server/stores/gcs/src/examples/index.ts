import type { Store } from '@walkeros/core';

/** Cloud Run with ADC, serving assets byte-exact (file mode) */
export const cloudRunAdc: Store.Config = {
  settings: {
    bucket: 'my-assets',
    prefix: 'public',
  },
  file: true,
};

/** Explicit service account for non-GCP environments (file mode) */
export const serviceAccount: Store.Config = {
  settings: {
    bucket: 'my-assets',
    prefix: 'public',
  },
  credentials: '$env.GCS_SA_KEY',
  file: true,
};

/** GCS as a structured key-value store (default mode, stored as JSON) */
export const structuredKv: Store.Config = {
  settings: {
    bucket: 'my-state',
  },
};

export * as step from './step';
