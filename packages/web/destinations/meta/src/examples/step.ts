import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the Meta Pixel script and calls
 * fbq('init', pixelId). Reproduce by passing the same settings to
 * `startFlow` as the destination config.
 */
export const init: Flow.StepExample = {
  title: 'Pixel init',
  description:
    'The destination loads the Meta Pixel script and initializes it with the configured pixelId.',
  in: {
    loadScript: true,
    settings: {
      pixelId: '1234567890',
    },
  },
  out: [['fbq', 'init', '1234567890']],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order complete event is mapped to the Meta Pixel Purchase standard event with value, currency, and product contents.',
  in: getEvent('order complete', { timestamp: 1700000000 }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        value: 'data.total',
        currency: { value: 'EUR' },
        contents: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                id: 'data.id',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
        content_type: { value: 'product' },
        num_items: {
          fn: (event: unknown) =>
            (event as WalkerOS.Event).nested.filter(
              (item) => item.entity === 'product',
            ).length,
        },
      },
    },
  },
  out: [
    [
      'fbq',
      'track',
      'Purchase',
      {
        value: 555,
        currency: 'EUR',
        contents: [
          { id: 'ers', quantity: 1 },
          { id: 'cc', quantity: 1 },
        ],
        content_type: 'product',
        num_items: 2,
      },
      { eventID: '1700000000-gr0up-1' },
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add event is mapped to the Meta Pixel AddToCart standard event with product contents and value.',
  in: getEvent('product add', { timestamp: 1700000001 }),
  mapping: {
    name: 'AddToCart',
    data: {
      map: {
        value: 'data.price',
        currency: { value: 'EUR' },
        contents: {
          set: [
            {
              map: {
                id: 'data.id',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
        content_type: { value: 'product' },
      },
    },
  },
  out: [
    [
      'fbq',
      'track',
      'AddToCart',
      {
        currency: 'EUR',
        value: 420,
        contents: [{ id: 'ers', quantity: 1 }],
        content_type: 'product',
      },
      { eventID: '1700000001-gr0up-1' },
    ],
  ],
};

export const viewContent: Flow.StepExample = {
  title: 'View content',
  description:
    'A product view event is mapped to the Meta Pixel ViewContent standard event with single-product contents.',
  in: getEvent('product view', { timestamp: 1700000002 }),
  mapping: {
    name: 'ViewContent',
    data: {
      map: {
        value: 'data.price',
        currency: { value: 'EUR' },
        content_type: { value: 'product' },
        contents: {
          set: [
            {
              map: {
                id: 'data.id',
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
      'fbq',
      'track',
      'ViewContent',
      {
        currency: 'EUR',
        value: 420,
        contents: [{ id: 'ers', quantity: 1 }],
        content_type: 'product',
      },
      { eventID: '1700000002-gr0up-1' },
    ],
  ],
};

export const initiateCheckout: Flow.StepExample = {
  title: 'Initiate checkout',
  description:
    'A cart view event is mapped to the Meta Pixel InitiateCheckout standard event with value and product contents.',
  in: getEvent('cart view', { timestamp: 1700000003 }),
  mapping: {
    name: 'InitiateCheckout',
    data: {
      map: {
        value: 'data.value',
        currency: { value: 'EUR' },
        contents: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                id: 'data.id',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
        num_items: {
          fn: (event: unknown) =>
            (event as WalkerOS.Event).nested.filter(
              (item) => item.entity === 'product',
            ).length,
        },
      },
    },
  },
  out: [
    [
      'fbq',
      'track',
      'InitiateCheckout',
      {
        currency: 'EUR',
        value: 840,
        contents: [{ id: 'ers', quantity: 2 }],
        num_items: 1,
      },
      { eventID: '1700000003-gr0up-1' },
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view event is forwarded to Meta Pixel as the PageView standard event with no extra parameters.',
  in: getEvent('page view', { timestamp: 1700000004 }),
  mapping: undefined,
  out: [['fbq', 'track', 'PageView', {}, { eventID: '1700000004-gr0up-1' }]],
};

export const customEventWithTrackCustom: Flow.StepExample = {
  title: 'Custom event',
  description:
    'A video complete event is sent as a Meta Pixel trackCustom call with a custom event name and parameters.',
  in: getEvent('video complete', {
    timestamp: 1700000005,
    data: { video_id: 'v1d30', duration: 120 },
  }),
  mapping: {
    settings: { trackCustom: 'VideoComplete' },
    data: {
      map: {
        video_id: 'data.video_id',
        duration: 'data.duration',
      },
    },
  },
  out: [
    [
      'fbq',
      'trackCustom',
      'VideoComplete',
      { video_id: 'v1d30', duration: 120 },
      { eventID: '1700000005-gr0up-1' },
    ],
  ],
};
