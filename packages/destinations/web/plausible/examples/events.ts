import { getEvent } from '@elbwalker/utils';

export function purchase() {
  const event = getEvent('order complete');

  return [
    'purchase',
    {
      revenue: {
        currency: 'EUR',
        amount: event.data.total,
      },
    },
  ];
}

export function customEvent() {
  const event = getEvent();

  return [
    'Custom Event',
    {
      props: event.data,
      revenue: event.data.number,
    },
  ];
}
