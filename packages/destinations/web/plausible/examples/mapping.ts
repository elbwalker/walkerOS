import type { Mapping } from '@elbwalker/types';
import type { DestinationPlausible } from '../src';

export const customEvent: DestinationPlausible.EventConfig = {
  name: 'Custom Event',
  data: {
    map: {
      props: 'data',
      revenue: 'data.number',
    },
  },
};

export const purchase: DestinationPlausible.EventConfig = {
  name: 'purchase',
  data: {
    map: {
      revenue: {
        map: {
          currency: { value: 'EUR' },
          amount: 'data.total',
        },
      },
    },
  },
};

export const config = {
  entity: { action: customEvent },
  order: { complete: purchase },
} satisfies Mapping.Config;
