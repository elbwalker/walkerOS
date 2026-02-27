import type { Flow } from '@walkeros/core';

/**
 * Step examples for the gtag destination.
 *
 * Each example represents a complete step contract:
 * - `in`: A walkerOS.Event that enters the destination
 * - `out`: The gtag() call arguments the destination produces
 *
 * These examples serve as:
 * - Test fixtures (it.each pattern)
 * - Simulation data (CLI --example flag)
 * - MCP/LLM context for mapping suggestions
 * - Living documentation of the destination's behavior
 */

export const purchase: Flow.StepExamples = {
  purchase: {
    in: {
      event: 'order',
      name: 'order complete',
      data: {
        id: 'ORD-123',
        total: 149.97,
        taxes: 11.25,
        shipping: 5.99,
        currency: 'EUR',
      },
      nested: [
        {
          entity: 'product',
          data: { id: 'SKU-001', name: 'T-Shirt', quantity: 2 },
        },
        {
          entity: 'product',
          data: { id: 'SKU-002', name: 'Hoodie', quantity: 1 },
        },
      ],
      id: 'evt-abc123',
      trigger: 'click',
      entity: 'order',
      action: 'complete',
      timestamp: 1700000000,
      group: 'grp-1',
      count: 1,
      version: { tagging: 1, collector: '3.0.0' },
      source: { type: 'web', id: '', previous_id: '' },
    },
    out: [
      'event',
      'purchase',
      {
        transaction_id: 'ORD-123',
        value: 149.97,
        tax: 11.25,
        shipping: 5.99,
        currency: 'EUR',
        items: [
          { item_id: 'SKU-001', item_name: 'T-Shirt', quantity: 2 },
          { item_id: 'SKU-002', item_name: 'Hoodie', quantity: 1 },
        ],
        send_to: 'G-XXXXXX-1',
      },
    ],
  },
};

export const addToCart: Flow.StepExamples = {
  add_to_cart: {
    in: {
      event: 'product',
      name: 'product add',
      data: {
        id: 'SKU-001',
        name: 'T-Shirt',
        price: 29.99,
        color: 'blue',
        currency: 'EUR',
      },
      id: 'evt-def456',
      trigger: 'click',
      entity: 'product',
      action: 'add',
      timestamp: 1700000001,
      group: 'grp-2',
      count: 1,
      version: { tagging: 1, collector: '3.0.0' },
      source: { type: 'web', id: '', previous_id: '' },
    },
    out: [
      'event',
      'add_to_cart',
      {
        currency: 'EUR',
        value: 29.99,
        items: [{ item_id: 'SKU-001', item_variant: 'blue', quantity: 1 }],
        send_to: 'G-XXXXXX-1',
      },
    ],
  },
};

export const pageView: Flow.StepExamples = {
  page_view: {
    in: {
      event: 'page',
      name: 'page view',
      data: {
        title: 'Home Page',
        url: 'https://example.com/',
        path: '/',
      },
      id: 'evt-ghi789',
      trigger: 'load',
      entity: 'page',
      action: 'view',
      timestamp: 1700000002,
      group: 'grp-3',
      count: 1,
      version: { tagging: 1, collector: '3.0.0' },
      source: { type: 'web', id: '', previous_id: '' },
    },
    out: [
      'event',
      'page_view',
      {
        send_to: 'G-XXXXXX-1',
      },
    ],
  },
};

/** All step examples combined for iteration */
export const all: Flow.StepExamples = {
  ...purchase,
  ...addToCart,
  ...pageView,
};
