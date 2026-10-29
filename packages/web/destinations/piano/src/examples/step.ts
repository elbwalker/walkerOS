import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

const settings = {
  site: 123456789,
  collectDomain: 'https://example.pa-cd.com',
};

/**
 * Destination bootstrap.
 * init configures the Piano `pa` SDK with the site id and collection domain
 * via setConfigurations.
 */
export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'Destination bootstrap configures Piano with the site id and collection domain.',
  in: {
    settings,
  },
  out: [['pa.setConfigurations', settings]],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view fires a Piano page.display event with the page name and chapter.',
  in: getEvent('page view', { timestamp: 1700000200000 }),
  mapping: {
    name: 'page.display',
    data: {
      map: {
        page: 'data.title',
        page_chapter1: 'globals.pagegroup',
      },
    },
  },
  out: [
    [
      'pa.sendEvent',
      'page.display',
      {
        page: 'walkerOS documentation',
        page_chapter1: 'docs',
      },
    ],
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order fires a Piano transaction.confirmation event with the transaction id, revenue and currency.',
  in: getEvent('order complete', { timestamp: 1700000201000 }),
  mapping: {
    name: 'transaction.confirmation',
    data: {
      map: {
        transaction_id: 'data.id',
        revenue: 'data.value',
        currency: 'data.currency',
      },
    },
  },
  out: [
    [
      'pa.sendEvent',
      'transaction.confirmation',
      {
        transaction_id: '0rd3r1d',
        revenue: 462,
        currency: 'EUR',
      },
    ],
  ],
};

export const customEvent: Flow.StepExample = {
  title: 'Custom event',
  description:
    'A generic entity action fires a custom Piano event with mapped properties.',
  in: getEvent('entity action', { timestamp: 1700000202000 }),
  mapping: {
    name: 'click.action',
    data: {
      map: {
        label: 'data.string',
        value: 'data.number',
      },
    },
  },
  out: [
    [
      'pa.sendEvent',
      'click.action',
      {
        label: 'foo',
        value: 1,
      },
    ],
  ],
};

/** A silent rule sends no Piano event. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no Piano event.',
  in: getEvent('page view', { timestamp: 1700000203000 }),
  mapping: { silent: true },
  out: [],
};

/**
 * Piano sends only on sendEvent, which the collector stops for a revoked
 * consent; the destination has no consent call to make.
 */
export const consentRevoke: Flow.StepExample = {
  public: false,
  description:
    'Piano Analytics sends only when the destination calls sendEvent, which walkerOS stops for a consent-gated destination after a revocation, so no consent call is needed.',
  command: 'consent',
  in: { analytics: false },
  out: [],
};
