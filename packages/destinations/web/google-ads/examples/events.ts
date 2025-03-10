import { getEvent } from '@elbwalker/utils';

export function conversion() {
  const event = getEvent('order complete');

  return [
    'event',
    'conversion',
    {
      send_to: 'AW-123456789/labelId',
      value: event.data.total,
      currency: 'EUR',
      transaction_id: event.data.id,
    },
  ];
}
