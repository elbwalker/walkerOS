import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Meta Pixel step examples. The four standard events follow Meta's Pixel
 * reference, run with the settings `{ pixelId: '1234567890' }`. Each out is
 * the call recorded on `window.fbq`; the fourth argument carries the walkerOS
 * event id as `eventID`, so the Conversions API can deduplicate it.
 *
 * Functions in mappings are published as source code, so they must not use
 * imported helpers.
 */

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the Meta Pixel script and calls
 * fbq('init', pixelId).
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
  out: [['window.fbq', 'init', '1234567890']],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is sent to Meta Pixel as the PageView standard event, with the event id for deduplication.',
  in: getEvent('page view'),
  out: [
    ['window.fbq', 'track', 'PageView', {}, { eventID: 'f0cc5f6fec3d8eeb' }],
  ],
};

export const viewContent: Flow.StepExample = {
  title: 'View content',
  description:
    'A product view is mapped to the Meta Pixel ViewContent standard event with product contents, currency and value.',
  in: getEvent('product view'),
  mapping: {
    name: 'ViewContent',
    data: {
      map: {
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
        currency: { key: 'data.currency', value: 'EUR' },
        value: 'data.price',
      },
    },
  },
  out: [
    [
      'window.fbq',
      'track',
      'ViewContent',
      {
        content_type: 'product',
        contents: [{ id: 'ers', quantity: 1 }],
        currency: 'EUR',
        value: 420,
      },
      { eventID: 'db22fb16c70f663d' },
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add is mapped to the Meta Pixel AddToCart standard event with product contents, currency and value.',
  in: getEvent('product add'),
  mapping: {
    name: 'AddToCart',
    data: {
      map: {
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
        currency: { key: 'data.currency', value: 'EUR' },
        value: 'data.price',
      },
    },
  },
  out: [
    [
      'window.fbq',
      'track',
      'AddToCart',
      {
        content_type: 'product',
        contents: [{ id: 'ers', quantity: 1 }],
        currency: 'EUR',
        value: 420,
      },
      { eventID: '83e860384d50953f' },
    ],
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order complete is mapped to the Meta Pixel Purchase standard event with value, currency, product contents and item count.',
  in: getEvent('order complete'),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        content_type: { value: 'product' },
        contents: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                typeof entity === 'object' &&
                entity !== null &&
                'entity' in entity &&
                entity.entity === 'product',
              map: {
                id: 'data.id',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
        currency: { key: 'data.currency', value: 'EUR' },
        num_items: {
          fn: (event: unknown) =>
            typeof event === 'object' &&
            event !== null &&
            'nested' in event &&
            Array.isArray(event.nested)
              ? event.nested.filter(
                  (entity: unknown) =>
                    typeof entity === 'object' &&
                    entity !== null &&
                    'entity' in entity &&
                    entity.entity === 'product',
                ).length
              : 0,
        },
        value: 'data.value',
      },
    },
  },
  out: [
    [
      'window.fbq',
      'track',
      'Purchase',
      {
        content_type: 'product',
        contents: [
          { id: 'ers', quantity: 1 },
          { id: 'cc', quantity: 1 },
        ],
        currency: 'EUR',
        num_items: 2,
        value: 462,
      },
      { eventID: '235d0d7bd7a213f2' },
    ],
  ],
};

export const initiateCheckout: Flow.StepExample = {
  public: false,
  title: 'Initiate checkout',
  description:
    'A cart view event is mapped to the Meta Pixel InitiateCheckout standard event with value and product contents.',
  in: getEvent('cart view'),
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
                typeof entity === 'object' &&
                entity !== null &&
                'entity' in entity &&
                entity.entity === 'product',
              map: {
                id: 'data.id',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
        num_items: {
          fn: (event: unknown) =>
            typeof event === 'object' &&
            event !== null &&
            'nested' in event &&
            Array.isArray(event.nested)
              ? event.nested.filter(
                  (entity: unknown) =>
                    typeof entity === 'object' &&
                    entity !== null &&
                    'entity' in entity &&
                    entity.entity === 'product',
                ).length
              : 0,
        },
      },
    },
  },
  out: [
    [
      'window.fbq',
      'track',
      'InitiateCheckout',
      {
        currency: 'EUR',
        value: 840,
        contents: [{ id: 'ers', quantity: 2 }],
        num_items: 1,
      },
      { eventID: '17fc82ac689238a0' },
    ],
  ],
};

export const customEventWithTrackCustom: Flow.StepExample = {
  public: false,
  title: 'Custom event',
  description:
    'A video complete event is sent as a Meta Pixel trackCustom call with a custom event name and parameters.',
  in: createEvent({
    name: 'video complete',
    id: '1700000005-gr0up-1',
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
      'window.fbq',
      'trackCustom',
      'VideoComplete',
      { video_id: 'v1d30', duration: 120 },
      { eventID: '1700000005-gr0up-1' },
    ],
  ],
};

/** A silent rule sends no fbq event. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no fbq event.',
  in: getEvent('page view'),
  mapping: { silent: true },
  out: [],
};

/**
 * A revocation of the consent the destination requires pauses the pixel's
 * own fires: config.consent { marketing: true }, granted first, then revoked.
 */
export const consentRevoke: Flow.StepExample = {
  public: false,
  description:
    'For a destination with config.consent { marketing: true }, revoking marketing calls fbq consent revoke, so the pixel stops its own fires too.',
  command: 'consent',
  in: { marketing: false },
  out: [['window.fbq', 'consent', 'revoke']],
};
