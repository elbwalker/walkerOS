import type { Flow } from '@walkeros/core';

export const gtagPurchase: Flow.StepExample = {
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
