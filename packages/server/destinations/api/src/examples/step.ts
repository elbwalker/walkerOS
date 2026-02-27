import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const fullEvent: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700000800,
    data: { title: 'Docs', url: 'https://example.com/docs' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    data: 'data',
  },
  out: {
    url: 'https://api.example.com/events',
    body: JSON.stringify({
      title: 'Docs',
      url: 'https://example.com/docs',
    }),
  },
};

export const customHeaders: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000801,
    data: { type: 'contact', email: 'user@example.com' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    data: 'data',
  },
  out: {
    url: 'https://api.example.com/events',
    body: JSON.stringify({
      type: 'contact',
      email: 'user@example.com',
    }),
    headers: { 'X-API-Key': 'YOUR_API_KEY' },
  },
};
