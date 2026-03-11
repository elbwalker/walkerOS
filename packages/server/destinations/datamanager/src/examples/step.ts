import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700001200,
    data: { id: 'ORD-600', total: 149.99, currency: 'EUR' },
    user: { id: 'user-abc', email: 'buyer@example.com' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        transactionId: 'data.id',
        conversionValue: 'data.total',
        currency: { key: 'data.currency', value: 'USD' },
        eventName: { value: 'purchase' },
        userId: 'user.id',
        email: 'user.id',
      },
    },
  },
  out: {
    events: [
      {
        transactionId: 'ORD-600',
        eventName: 'purchase',
        eventSource: 'WEB',
        conversionValue: 149.99,
        currency: 'EUR',
        userId: 'user-abc',
        email: 'buyer@example.com',
      },
    ],
  },
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700001201,
    data: { type: 'demo-request' },
    user: { email: 'prospect@example.com' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    name: 'generate_lead',
    data: {
      map: {
        eventName: { value: 'generate_lead' },
        conversionValue: { value: 10 },
        currency: { value: 'USD' },
      },
    },
  },
  out: {
    events: [
      {
        transactionId: '1700001201-gr0up-1',
        eventName: 'generate_lead',
        eventSource: 'WEB',
        email: 'prospect@example.com',
      },
    ],
  },
};

export const ga4PageView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700001202,
    data: { title: 'Pricing', url: 'https://example.com/pricing' },
    user: { id: 'visitor-55' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    name: 'page_view',
    data: {
      map: {
        eventName: { value: 'page_view' },
        userId: 'user.id',
      },
    },
  },
  out: {
    events: [
      {
        transactionId: '1700001202-gr0up-1',
        eventName: 'page_view',
        eventSource: 'WEB',
        userId: 'visitor-55',
      },
    ],
  },
};
