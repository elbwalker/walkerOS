import type { Mapping } from '@walkerOS/types';
import type { DestinationPlausible } from '..';

export const customEvent: DestinationPlausible.Rule = {
  name: 'Custom Event',
  data: {
    map: {
      props: 'data',
      revenue: 'data.number',
    },
  },
};

export const purchase: DestinationPlausible.Rule = {
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
} satisfies DestinationPlausible.Rules;
