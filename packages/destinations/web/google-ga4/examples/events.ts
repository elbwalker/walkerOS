import type { WalkerOS } from '@elbwalker/types';
import { getEvent } from '@elbwalker/utils';

export function purchase(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('order complete');
  const product1 = event.nested[0].data;
  const product2 = event.nested[1].data;

  return [
    'event',
    'purchase',
    {
      transaction_id: event.data.id,
      value: event.data.total,
      tax: event.data.taxes,
      shipping: event.data.shipping,
      currency: 'EUR',
      items: [
        { item_id: product1.id, item_name: product1.name, quantity: 1 },
        { item_id: product2.id, item_name: product2.name, quantity: 1 },
      ],
      send_to: 'G-XXXXXX-1',
      ...custom,
    },
  ];
}

export function add_to_cart(custom: WalkerOS.AnyObject = {}) {
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
      ...custom,
    },
  ];
}
