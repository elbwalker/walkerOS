import type { WalkerOS } from '@elbwalker/types';
import { getEvent } from '@elbwalker/utils';

export function Purchase(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('order complete');

  return [];
}

export function ecommerceAddToCart(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('product add');

  return [
    [
      'ecommerceAddToCart',
      [
        {
          sku: event.data.id,
          name: event.data.name,
          price: event.data.price,
          quantity: 1,
          variant: event.data.color,
          customDimensions: {
            1: event.data.size,
          },
          ...custom,
        },
      ],
      { currencyCode: 'EUR' },
    ],
  ];
}

export function InitiateCheckout(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('cart view');

  return [];
}
