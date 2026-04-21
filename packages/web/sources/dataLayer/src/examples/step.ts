import type { Flow } from '@walkeros/core';

export const gtagPurchase: Flow.StepExample = {
  title: 'gtag purchase',
  description:
    'A gtag purchase call pushed to the dataLayer is captured as a walker dataLayer purchase event with item details.',
  trigger: { type: 'gtag' },
  in: [
    'event',
    'purchase',
    {
      transaction_id: 'T-12345',
      value: 25.42,
      currency: 'EUR',
      items: [{ item_id: 'SKU-1', item_name: 'T-Shirt', quantity: 1 }],
    },
  ],
  out: [
    [
      'elb',
      {
        name: 'dataLayer purchase',
        data: {
          transaction_id: 'T-12345',
          value: 25.42,
          currency: 'EUR',
          items: [{ item_id: 'SKU-1', item_name: 'T-Shirt', quantity: 1 }],
        },
      },
    ],
  ],
};

export const consentUpdate: Flow.StepExample = {
  title: 'Consent update',
  description:
    'A gtag consent update is captured from the dataLayer as a walker dataLayer consent update event.',
  trigger: { type: 'gtag' },
  in: [
    'consent',
    'update',
    {
      ad_storage: 'granted',
      analytics_storage: 'granted',
    },
  ],
  out: [
    [
      'elb',
      {
        name: 'dataLayer consent update',
        data: {
          ad_storage: 'granted',
          analytics_storage: 'granted',
        },
      },
    ],
  ],
};

export const gtagAddToCart: Flow.StepExample = {
  title: 'gtag add_to_cart',
  description:
    'A gtag add_to_cart call pushed to the dataLayer is captured as a walker dataLayer add_to_cart event.',
  trigger: { type: 'gtag' },
  in: [
    'event',
    'add_to_cart',
    {
      currency: 'EUR',
      value: 15.25,
      items: [
        {
          item_id: 'SKU_12345',
          item_name: 'T-Shirt',
          item_variant: 'red',
          quantity: 1,
          price: 15.25,
        },
      ],
    },
  ],
  out: [
    [
      'elb',
      {
        name: 'dataLayer add_to_cart',
        data: {
          currency: 'EUR',
          value: 15.25,
          items: [
            {
              item_id: 'SKU_12345',
              item_name: 'T-Shirt',
              item_variant: 'red',
              quantity: 1,
              price: 15.25,
            },
          ],
        },
      },
    ],
  ],
};

export const gtagViewItem: Flow.StepExample = {
  title: 'gtag view_item',
  description:
    'A gtag view_item call pushed to the dataLayer is captured as a walker dataLayer view_item event with item data.',
  trigger: { type: 'gtag' },
  in: [
    'event',
    'view_item',
    {
      currency: 'EUR',
      value: 29.99,
      items: [
        {
          item_id: 'SKU_67890',
          item_name: 'Sneakers',
          item_category: 'Footwear',
          price: 29.99,
        },
      ],
    },
  ],
  out: [
    [
      'elb',
      {
        name: 'dataLayer view_item',
        data: {
          currency: 'EUR',
          value: 29.99,
          items: [
            {
              item_id: 'SKU_67890',
              item_name: 'Sneakers',
              item_category: 'Footwear',
              price: 29.99,
            },
          ],
        },
      },
    ],
  ],
};

export const directEvent: Flow.StepExample = {
  title: 'Direct dataLayer event',
  description:
    'A plain object pushed directly onto the dataLayer is captured as a walker dataLayer custom event.',
  trigger: { type: 'direct' },
  in: {
    event: 'custom_event',
    category: 'engagement',
    label: 'video_play',
  },
  out: [
    [
      'elb',
      {
        name: 'dataLayer custom_event',
        data: {
          category: 'engagement',
          label: 'video_play',
        },
      },
    ],
  ],
};
