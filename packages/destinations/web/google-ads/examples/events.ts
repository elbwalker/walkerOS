import type { WalkerOS } from '@elbwalker/types';
import { getEvent } from '@elbwalker/utils';

export function conversion(custom: WalkerOS.AnyObject = {}) {
  const event = getEvent('order complete');

  return [
    'event',
    'conversion',
    {
      send_to: 'AW-123456789/label',
      value: event.data.total,
      currency: 'EUR',
      transaction_id: event.data.id,
      ...custom,
    },
  ];
}
