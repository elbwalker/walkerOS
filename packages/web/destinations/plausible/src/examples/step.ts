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
  in: getEvent('order complete', { timestamp: 1700000200000 }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        revenue: {
          map: {
            currency: { value: 'EUR' },
            amount: 'data.value',
          },
        },
      },
    },
  },
  out: [
    [
      'window.plausible',
      'purchase',
      {
        revenue: {
          currency: 'EUR',
          amount: 462,
        },
      },
    ],
  ],
};

export const customEvent: Flow.StepExample = {
  title: 'Custom event',
  description:
    'A generic entity action fires a Plausible custom event with mapped scalar props.',
  in: getEvent('entity action', { timestamp: 1700000201000 }),
  mapping: {
    name: 'Custom Event',
    data: {
      map: {
        props: {
          map: {
            string: 'data.string',
            number: 'data.number',
            boolean: 'data.boolean',
          },
        },
      },
    },
  },
  out: [
    [
      'window.plausible',
      'Custom Event',
      {
        props: {
          string: 'foo',
          number: 1,
          boolean: true,
        },
      },
    ],
  ],
};

/** A silent rule sends no Plausible event. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no Plausible event.',
  in: getEvent('page view', { timestamp: 1700000600000 }),
  mapping: { silent: true },
  out: [],
};

/**
 * A revocation of the consent the destination requires. Plausible has no
 * consent mode, so the collector's consent gate is the only mechanism and no
 * vendor call is made.
 */
export const consentRevoke: Flow.StepExample = {
  public: false,
  description:
    'For a destination with config.consent { marketing: true }, revoking marketing makes no vendor call: Plausible has no consent mode, the collector stops sending.',
  command: 'consent',
  in: { marketing: false },
  out: [],
};
