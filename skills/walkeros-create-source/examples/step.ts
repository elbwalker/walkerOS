import type { Flow } from '@walkeros/core';

/**
 * Step examples for the server source template: `in` is the request the
 * trigger sends, `out` what the source hands the collector.
 */

export const pageViewWebhook: Flow.StepExample = {
  title: 'Page view webhook',
  description:
    'A POST with the platform page_view body becomes a walker event with its properties as data and the user id.',
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    url: 'http://localhost/webhook',
    body: {
      event: 'page_view',
      properties: { page_title: 'Home Page', page_path: '/home' },
      userId: 'user-123',
    },
  },
  out: [
    [
      'elb',
      {
        name: 'page_view',
        data: { page_title: 'Home Page', page_path: '/home' },
        user: { id: 'user-123' },
      },
    ],
  ],
};

export const invalidBody: Flow.StepExample = {
  public: false,
  description:
    'A body without an event name is answered with 400 and reaches no destination.',
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    url: 'http://localhost/webhook',
    body: { properties: { page_title: 'Home Page' } },
  },
  out: [],
};
