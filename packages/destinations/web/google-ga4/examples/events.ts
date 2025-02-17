import type { DestinationGoogleGA4 } from '../src';
import { getEvent } from '@elbwalker/utils';

const customDefault: DestinationGoogleGA4.Custom = {
  measurementId: 'G-XXXXXX-1',
};

function useCustom(custom: DestinationGoogleGA4.Custom = customDefault) {
  return {
    send_to: custom.measurementId,
  };
}

export function purchase(custom: DestinationGoogleGA4.Custom = customDefault) {
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
      ...useCustom(custom),
    },
  ];
}

export function add_to_cart(
  custom: DestinationGoogleGA4.Custom = customDefault,
) {
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
      ...useCustom(custom),
    },
  ];
}
