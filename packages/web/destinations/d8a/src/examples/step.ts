import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

const INIT_DATE_MS = 1700000000000;
const INIT_DATE = new Date(INIT_DATE_MS);
const PROPERTY_ID = '80e1d6d0-560d-419f-ac2a-fe9281e93386';
const SERVER_CONTAINER_URL =
  'https://global.t.d8a.tech/80e1d6d0-560d-419f-ac2a-fe9281e93386/d/c';

export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'The destination installs d8a and configures a property with its server container URL.',
  in: {
    settings: {
      property_id: PROPERTY_ID,
      server_container_url: SERVER_CONTAINER_URL,
    },
  },
  out: [
    ['d8a', 'js', INIT_DATE],
    [
      'd8a',
      'config',
      PROPERTY_ID,
      { server_container_url: SERVER_CONTAINER_URL },
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description: 'A page view event is forwarded as a d8a page_view event.',
  in: getEvent('page view', { timestamp: 1700000300 }),
  mapping: undefined,
  out: [['d8a', 'event', 'page_view', { send_to: PROPERTY_ID }]],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add event is mapped to the d8a add_to_cart event with item details and value.',
  in: getEvent('product add', { timestamp: 1700000301 }),
  mapping: {
    name: 'add_to_cart',
    include: ['data'],
    data: {
      map: {
        currency: { value: 'EUR', key: 'data.currency' },
        value: 'data.price',
        items: {
          loop: [
            'this',
            {
              map: {
                item_id: 'data.id',
                item_variant: 'data.color',
                quantity: { value: 1, key: 'data.quantity' },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'd8a',
      'event',
      'add_to_cart',
      {
        currency: 'EUR',
        value: 420,
        items: [{ item_id: 'ers', item_variant: 'black', quantity: 1 }],
        data_id: 'ers',
        data_name: 'Everyday Ruck Snack',
        data_color: 'black',
        data_size: 'l',
        data_price: 420,
        send_to: PROPERTY_ID,
      },
    ],
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order complete event is mapped to the d8a purchase event with transaction details and nested product items.',
  in: getEvent('order complete', { timestamp: 1700000302 }),
  mapping: {
    name: 'purchase',
    include: ['data', 'context'],
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.total',
        tax: 'data.taxes',
        shipping: 'data.shipping',
        currency: { key: 'data.currency', value: 'EUR' },
        items: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) => {
                const candidate = entity as { entity?: unknown };
                return isObject(entity) && candidate.entity === 'product';
              },
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'd8a',
      'event',
      'purchase',
      {
        transaction_id: '0rd3r1d',
        value: 555,
        tax: 73.76,
        shipping: 5.22,
        currency: 'EUR',
        items: [
          { item_id: 'ers', item_name: 'Everyday Ruck Snack', quantity: 1 },
          { item_id: 'cc', item_name: 'Cool Cap', quantity: 1 },
        ],
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_shipping: 5.22,
        data_taxes: 73.76,
        data_total: 555,
        context_shopping: 'complete',
        send_to: PROPERTY_ID,
      },
    ],
  ],
};

export const consentMode: Flow.StepExample = {
  title: 'Consent mode',
  description:
    'A walker consent command updates d8a using gtag consent mode parameters.',
  command: 'consent',
  in: { marketing: true, functional: true },
  out: [
    [
      'd8a',
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      },
    ],
    [
      'd8a',
      'consent',
      'update',
      {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      },
    ],
  ],
};
