import type { Flow } from '@walkeros/core';

/**
 * Step examples for the redact transformer, with the settings
 * `{ fieldsToRedact: ['email'] }`. `out` is the transformer's return.
 */
export const redactEmail: Flow.StepExample = {
  title: 'Redact email',
  description:
    'With fieldsToRedact ["email"], the email is removed from the event data and the event continues.',
  in: {
    name: 'product view',
    data: { id: 'P-123', name: 'Widget', email: 'user@example.com' },
  },
  out: [
    [
      'return',
      {
        event: {
          name: 'product view',
          data: { id: 'P-123', name: 'Widget' },
        },
      },
    ],
  ],
};

export const nothingToRedact: Flow.StepExample = {
  title: 'Nothing to redact',
  description:
    'An event without the fields to redact passes through unchanged.',
  in: { name: 'page view', data: { title: 'Home' } },
  out: [['return', { event: { name: 'page view', data: { title: 'Home' } } }]],
};
