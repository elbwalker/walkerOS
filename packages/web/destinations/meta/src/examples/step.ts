import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const purchase: Flow.StepExample = {
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
  in: getEvent('page view', { timestamp: 1700000004 }),
  mapping: undefined,
  out: [['fbq', 'track', 'PageView', {}, { eventID: '1700000004-gr0up-1' }]],
};

export const customEventWithTrackCustom: Flow.StepExample = {
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
