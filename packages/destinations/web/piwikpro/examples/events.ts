import type { WalkerOS } from '@elbwalker/types';
import { getEvent } from '@elbwalker/utils';

function getProduct(entity: WalkerOS.Entity | WalkerOS.Event) {
  return {
    sku: entity.data.id,
    name: entity.data.name,
    price: entity.data.price,
    quantity: 1,
    variant: entity.data.color,
    customDimensions: {
      1: entity.data.size,
    },
  };
}

export function ecommerceOrder(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('order complete');

  return [
    [
      'ecommerceOrder',
      event.nested.filter((item) => item.type === 'product').map(getProduct),
      {
        orderId: event.data.id,
        grandTotal: event.data.total,
        tax: event.data.taxes,
        shipping: event.data.shipping,
        ...custom,
      },
      { currencyCode: 'EUR' },
    ],
  ];
}

export function ecommerceAddToCart(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('product add');

  return [
    [
      'ecommerceAddToCart',
      [
        {
          ...getProduct(event),
          ...custom,
        },
      ],
      { currencyCode: 'EUR' },
    ],
  ];
}

export function ecommerceProductDetailView(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('product view');

  return [
    [
      'ecommerceProductDetailView',
      [
        {
          ...getProduct(event),
          ...custom,
        },
      ],
      { currencyCode: 'EUR' },
    ],
  ];
}

export function ecommerceCartUpdate(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('cart view');

  return [
    [
      'ecommerceCartUpdate',
      event.nested.filter((item) => item.type === 'product').map(getProduct),
      event.data.total,
      { currencyCode: 'EUR' },
    ],
  ];
}
