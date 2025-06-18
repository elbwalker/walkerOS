import type { Mapping } from '@walkerOS/types';
import type { DestinationAPI } from '..';

export const entity_action: DestinationAPI.EventConfig = {
  data: 'data',
};

export const config = {
  entity: { action: entity_action },
} satisfies Mapping.Config;
