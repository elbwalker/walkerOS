import type { Store } from '@walkeros/core';

export * as env from './env';

/** Read customer records from a CRM API, the token from a managed secret */
export const crmApi: Store.Config = {
  settings: {
    url: 'https://crm.example.com/customers/{key}',
  },
  credentials: { token: '$secret.CRM_API_TOKEN' },
};

/** An API that takes the id as a query parameter, without a token */
export const queryParameter: Store.Config = {
  settings: {
    url: 'https://crm.example.com/customers?id={key}',
  },
};

export * as step from './step';
