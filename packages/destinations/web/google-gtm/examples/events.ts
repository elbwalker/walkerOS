import { getEvent } from '@elbwalker/utils';

export function entity_action() {
  const event = getEvent('entity action');

  return {
    event: 'entity_action',
    data: event.data,
  };
}

export function purchase() {
  const event = getEvent('order complete');

  return {
    event: 'purchase',
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
  };
}

export function add_to_cart() {
  const event = getEvent('product add');

  return {
    event: 'add_to_cart',
    currency: 'EUR',
    value: event.data.price,
    items: [
      {
        item_id: event.data.id,
        item_variant: event.data.color,
        quantity: 1,
      },
    ],
  };
}
