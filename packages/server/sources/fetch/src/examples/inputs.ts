import type { WalkerOS } from '@walkeros/core';

/**
 * Example walkerOS events that HTTP clients send to this source.
 * These are the CONTRACT - tests verify implementation handles these inputs.
 */

// Simple page view event
export const pageView: WalkerOS.DeepPartialEvent = {
  name: 'page view',
  data: {
    title: 'Home Page',
    path: '/',
    referrer: 'https://google.com',
  },
  user: {
    id: 'user-123',
    session: 'session-456',
  },
  timestamp: 1700000000000,
};

// E-commerce event with nested entities
export const productAdd: WalkerOS.DeepPartialEvent = {
  name: 'product add',
  data: {
    id: 'P-123',
    name: 'Laptop',
    price: 999.99,
    quantity: 1,
  },
  context: {
    stage: ['shopping', 1],
  },
  globals: {
    language: 'en',
    currency: 'USD',
  },
  user: {
    id: 'user-123',
  },
  nested: [
    {
      entity: 'category',
      data: {
        name: 'Electronics',
        path: '/electronics',
      },
    },
  ],
  consent: {
    functional: true,
    marketing: true,
  },
};

// Complete event with all optional fields
export const completeEvent: WalkerOS.DeepPartialEvent = {
  name: 'order complete',
  data: {
    id: 'ORDER-123',
    total: 999.99,
    currency: 'USD',
  },
  context: {
    stage: ['checkout', 3],
    test: ['variant-A', 0],
  },
  globals: {
    language: 'en',
    country: 'US',
  },
  custom: {
    campaignId: 'summer-sale',
    source: 'email',
  },
  user: {
    id: 'user-123',
    email: 'user@example.com',
    session: 'session-456',
  },
  nested: [
    {
      entity: 'product',
      data: {
        id: 'P-123',
        price: 999.99,
      },
    },
  ],
  consent: {
    functional: true,
    marketing: true,
    analytics: false,
  },
  trigger: 'click',
  group: 'ecommerce',
};

// Minimal valid event
export const minimal: WalkerOS.DeepPartialEvent = {
  name: 'ping',
};

// Batch of events
export const batch: WalkerOS.DeepPartialEvent[] = [
  pageView,
  productAdd,
  { name: 'button click', data: { id: 'cta' } },
];
