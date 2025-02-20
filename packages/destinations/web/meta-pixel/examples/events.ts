import type { WalkerOS } from '@elbwalker/types';
import { getEvent } from '@elbwalker/utils';

export function Purchase(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('order complete');
  const product1 = event.nested[0].data;
  const product2 = event.nested[1].data;

  return [
    'track',
    'Purchase',
    {
      value: event.data.total,
      currency: 'EUR',
      contents: [
        { id: product1.id, quantity: 1 },
        { id: product2.id, quantity: 1 },
      ],
      content_type: 'product',
      num_items: 2,
      ...custom,
    },
  ];
}

export function AddToCart(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('product add');

  return [
    'track',
    'AddToCart',
    {
      currency: 'EUR',
      value: event.data.price,
      contents: [{ id: event.data.id, quantity: 1 }],
      content_type: 'product',
      ...custom,
    },
  ];
}
