import type { BodyParameters } from '../types';
import { getEvent } from '@elbwalker/utils';

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
        user_data: {},
        num_items: 2,
        order_id: String(event.data.id),
        contents: event.nested
          .filter((item) => item.type === 'product')
          .map((item) => ({
            id: String(item.data.id),
            quantity: Number(item.data.quantity) || 1,
            item_price: Number(item.data.price),
          })),
      },
    ],
  };
}
