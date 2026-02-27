import type { Flow } from '@walkeros/core';

export const gtagPurchase: Flow.StepExample = {
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
  out: {
    name: 'dataLayer purchase',
    data: {
      transaction_id: 'T-12345',
      value: 25.42,
      currency: 'EUR',
      items: [{ item_id: 'SKU-1', item_name: 'T-Shirt', quantity: 1 }],
    },
    entity: 'dataLayer',
    action: 'purchase',
  },
};

export const consentUpdate: Flow.StepExample = {
  in: [
    'consent',
    'update',
    {
      ad_storage: 'granted',
      analytics_storage: 'granted',
    },
  ],
  out: {
    name: 'dataLayer consent update',
    data: {
      ad_storage: 'granted',
      analytics_storage: 'granted',
    },
    entity: 'dataLayer',
    action: 'consent update',
  },
};

export const directEvent: Flow.StepExample = {
  in: {
    event: 'custom_event',
    category: 'engagement',
    label: 'video_play',
  },
  out: {
    name: 'dataLayer custom_event',
    data: {
      category: 'engagement',
      label: 'video_play',
    },
    entity: 'dataLayer',
    action: 'custom_event',
  },
};
