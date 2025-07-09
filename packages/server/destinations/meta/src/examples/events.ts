import type { BodyParameters } from '../types';
import { getEvent } from '@walkerOS/core';

export function Purchase(): BodyParameters {
  const event = getEvent('order complete');

  return {
    data: [
      {
        event_name: 'Purchase',
        event_time: event.timestamp / 1000,
        event_id: event.id,
        event_source_url: event.source.id,
        action_source: 'website',
        user_data: {
          external_id: [
            'cc8e27118413234d4297ed00a02711365312c79325df9b5b8f4199cbd0b96e7e',
            '9176e6f336dbdb4f99b0e45cbd7e41e0e2323812b236822842a61ffbd362ac8c',
          ],
        },
        order_id: String(event.data.id),
        currency: 'EUR',
        value: Number(event.data.total),
        contents: event.nested
          .filter((item) => item.type === 'product')
          .map((item) => ({
            id: String(item.data.id),
            quantity: Number(item.data.quantity) || 1,
            item_price: Number(item.data.price),
          })),
        num_items: 2,
      },
    ],
  };
}
