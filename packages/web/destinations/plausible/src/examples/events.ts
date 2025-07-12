import { getEvent } from '@walkerOS/core';

export function purchase(): unknown[] {
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

export function customEvent(): unknown[] {
  const event = getEvent();

  return [
    'Custom Event',
    {
      props: event.data,
      revenue: event.data.number,
    },
  ];
}
