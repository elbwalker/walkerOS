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
  in: getEvent('page view', { timestamp: 1700000200 }),
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
  in: getEvent('order complete', { timestamp: 1700000201 }),
  mapping: {
    name: 'transaction.confirmation',
    data: {
      map: {
        transaction_id: 'data.id',
        revenue: 'data.total',
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
        revenue: 555,
        currency: 'EUR',
      },
    ],
  ],
};

export const customEvent: Flow.StepExample = {
  title: 'Custom event',
  description:
    'A generic entity action fires a custom Piano event with mapped properties.',
  in: getEvent('entity action', { timestamp: 1700000202 }),
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
