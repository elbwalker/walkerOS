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

export const customTransform: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000802,
    data: { id: 'ORD-500', total: 199.99, currency: 'USD' },
    user: { id: 'buyer-42' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    data: {
      map: {
        order_id: 'data.id',
        amount: 'data.total',
        currency: 'data.currency',
        customer_id: 'user.id',
        event_type: 'name',
      },
    },
  },
  out: {
    url: 'https://api.example.com/events',
    body: JSON.stringify({
      order_id: 'ORD-500',
      amount: 199.99,
      currency: 'USD',
      customer_id: 'buyer-42',
      event_type: 'order complete',
    }),
  },
};
