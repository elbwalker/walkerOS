import type { WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

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

export function ecommerceOrder(): unknown[] {
  const event = getEvent('order complete');

  return [
    [
      'ecommerceOrder',
      event.nested.filter((item) => item.entity === 'product').map(getProduct),
      {
        orderId: event.data.id,
        grandTotal: event.data.total,
        tax: event.data.taxes,
        shipping: event.data.shipping,
      },
      { currencyCode: 'EUR' },
    ],
  ];
}

export function ecommerceAddToCart(): unknown[] {
  const event = getEvent('product add');

  return [
    ['ecommerceAddToCart', [getProduct(event), ,], { currencyCode: 'EUR' }],
  ];
}

export function ecommerceProductDetailView(): unknown[] {
  const event = getEvent('product view');

  return [
    [
      'ecommerceProductDetailView',
      [getProduct(event), ,],
      { currencyCode: 'EUR' },
    ],
  ];
}

export function ecommerceCartUpdate(): unknown[] {
  const event = getEvent('cart view');

  return [
    [
      'ecommerceCartUpdate',
      event.nested.filter((item) => item.entity === 'product').map(getProduct),
      event.data.value,
      { currencyCode: 'EUR' },
    ],
  ];
}
