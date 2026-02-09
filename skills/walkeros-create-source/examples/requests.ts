import * as inputs from './inputs';

/**
 * HTTP request examples for testing server source handlers.
 *
 * Create this file for server sources (Phase 2).
 */

export const validPostRequest = {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': 'test-key',
  },
  body: JSON.stringify(inputs.pageViewInput),
};

export const batchRequest = {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    batch: [inputs.pageViewInput, inputs.purchaseInput],
  }),
};

export const invalidRequest = {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: 'invalid json{',
};
