import type { Store } from '@walkeros/core';

/** Cloud Run with ADC, no credentials field needed. */
export const cloudRunAdc: Store.Config = {
  settings: {
    id: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
    sheet: 'Customers',
  },
};

/** Explicit service account JSON for non-GCP environments. */
export const serviceAccount: Store.Config = {
  settings: {
    id: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
    sheet: 'Customers',
    credentials: '$env.SHEETS_SA_KEY',
  },
};

export * as step from './step';
