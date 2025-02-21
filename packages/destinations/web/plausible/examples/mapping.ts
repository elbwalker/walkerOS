import type { Mapping } from '@elbwalker/types';
import type { DestinationPlausible } from '../src';

export const entity_action: DestinationPlausible.EventConfig = {
  name: 'EntityAction',
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
  entity: { action: entity_action },
  order: { complete: purchase },
} satisfies Mapping.Config;
