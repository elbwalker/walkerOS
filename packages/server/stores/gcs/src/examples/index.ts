import type { Store } from '@walkeros/core';

/** Cloud Run with ADC — no credentials needed */
export const cloudRunAdc: Store.Config = {
  settings: {
    bucket: 'my-assets',
    prefix: 'public',
  },
};

/** Explicit service account for non-GCP environments */
export const serviceAccount: Store.Config = {
  settings: {
    bucket: 'my-assets',
    prefix: 'public',
    credentials: '$env.GCS_SA_KEY',
  },
};
