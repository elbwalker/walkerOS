import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the Plausible script tag
 * with the configured domain and installs the global `plausible` queue.
 */
export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'Destination bootstrap loads the Plausible script for the configured domain and installs the queue.',
  in: {
    loadScript: true,
    settings: {
      domain: 'example.com',
    },
  },
  out: [
    [
      'script.appendChild',
      {
        src: 'https://plausible.io/js/script.manual.js',
        domain: 'example.com',
      },
    ],
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order fires a Plausible purchase event with revenue currency and amount.',
  in: getEvent('order complete', { timestamp: 1700000200 }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        revenue: {
          map: {
            currency: { value: 'EUR' },
            amount: 'data.total',
          },
        },
      },
    },
  },
  out: [
    [
      'plausible',
      'purchase',
      {
        revenue: {
          currency: 'EUR',
          amount: 555,
        },
      },
    ],
  ],
};

export const customEvent: Flow.StepExample = {
  title: 'Custom event',
  description:
    'A generic entity action fires a Plausible custom event with mapped props and a revenue field.',
  in: getEvent('entity action', { timestamp: 1700000201 }),
  mapping: {
    name: 'Custom Event',
    data: {
      map: {
        props: 'data',
        revenue: 'data.number',
      },
    },
  },
  out: [
    [
      'plausible',
      'Custom Event',
      {
        props: {
          string: 'foo',
          number: 1,
          boolean: true,
          array: [0, 'text', false],
        },
        revenue: 1,
      },
    ],
  ],
};
