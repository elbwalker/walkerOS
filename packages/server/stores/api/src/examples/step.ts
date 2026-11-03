import type { Flow } from '@walkeros/core';

/** Read the record of a known id. */
export const readRecord: Flow.StepExample = {
  title: 'Read a record',
  description:
    'Read the customer record of a known id from the API and receive its parsed JSON body',
  in: { operation: 'get', key: 'cust-42' },
  out: [['get', 'cust-42', { ltv: 420, segment: 'loyal' }]],
};

/** An id the API does not know. */
export const unknownRecord: Flow.StepExample = {
  title: 'Unknown id',
  description:
    'The API answers 404 for an id it does not know: get answers a miss, so the mapping fallbacks apply',
  in: { operation: 'get', key: 'cust-404' },
  out: [['get', 'cust-404', undefined]],
};

/** The API refuses the token. */
export const unauthorized: Flow.StepExample = {
  public: false,
  description:
    'The API refuses the request (401, 403, 429 or 5xx): get throws a StepError with the status instead of answering a miss, and the collector reports it.',
  in: { operation: 'get', key: 'cust-42' },
  respond: { status: 401 },
  outcome: { status: 'failed', code: 'transport' },
};
