import { getEvent } from '@elbwalker/utils';

export function Purchase() {
  const event = getEvent('order complete');

  return [
    'track',
    'Purchase',
    {
      value: event.data.total,
      currency: 'EUR',
      contents: event.nested
        .filter((item) => item.type === 'product')
        .map((item) => ({ id: item.data.id, quantity: 1 })),
      content_type: 'product',
      num_items: 2,
    },
  ];
}

export function AddToCart() {
  const event = getEvent('product add');

  return [
    'track',
    'AddToCart',
    {
      currency: 'EUR',
      value: event.data.price,
      contents: [{ id: event.data.id, quantity: 1 }],
      content_type: 'product',
    },
  ];
}

export function InitiateCheckout() {
  const event = getEvent('cart view');

  return [
    'track',
    'InitiateCheckout',
    {
      currency: 'EUR',
      value: event.data.value,
      contents: event.nested
        .filter((entity) => entity.type === 'product')
        .map((entity) => ({
          id: entity.data.id,
          quantity: entity.data.quantity,
        })),
      num_items: event.nested.filter((item) => item.type === 'product').length,
    },
  ];
}

export function ViewContent() {
  const event = getEvent('product view');

  return [
    'track',
    'ViewContent',
    {
      currency: 'EUR',
      value: event.data.price,
      contents: [{ id: event.data.id, quantity: 1 }],
      content_type: 'product',
    },
  ];
}
