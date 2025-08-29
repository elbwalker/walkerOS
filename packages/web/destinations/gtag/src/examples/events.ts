import { getEvent } from '@walkeros/core';

// GA4 Purchase Event Example
export function ga4Purchase(): unknown[] {
  const event = getEvent('order complete');

  return [
    'event',
    'purchase',
    {
      transaction_id: event.data.id,
      value: event.data.total,
      tax: event.data.taxes,
      shipping: event.data.shipping,
      currency: 'EUR',
      items: event.nested
        .filter((item) => item.type === 'product')
        .map((item) => ({
          item_id: item.data.id,
          item_name: item.data.name,
          quantity: 1,
        })),
      send_to: 'G-XXXXXX-1',
    },
  ];
}

// GA4 Add to Cart Event Example
export function ga4AddToCart(): unknown[] {
  const event = getEvent('product add');

  return [
    'event',
    'add_to_cart',
    {
      currency: 'EUR',
      value: event.data.price,
      items: [
        {
          item_id: event.data.id,
          item_variant: event.data.color,
          quantity: 1,
        },
      ],
      send_to: 'G-XXXXXX-1',
    },
  ];
}

// Google Ads Conversion Event Example
export function adsConversion(): unknown[] {
  const event = getEvent('order complete');

  return [
    'event',
    'conversion',
    {
      send_to: 'AW-XXXXXXXXX/CONVERSION_LABEL',
      currency: 'EUR',
      value: event.data.total,
      transaction_id: event.data.id,
    },
  ];
}

// GTM DataLayer Push Example
export function gtmEvent(): Record<string, unknown> {
  const event = getEvent('product view');

  return {
    event: 'product_view',
    product_id: event.data.id,
    product_name: event.data.name,
    product_category: event.data.category,
    value: event.data.price,
    currency: 'EUR',
  };
}
