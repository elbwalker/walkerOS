import type { Mapping } from '@elbwalker/types';
import type { DestinationWebAPI } from '../src';

export const entity_action: DestinationWebAPI.EventConfig = {
  data: 'data',
};

export const config = {
  entity: { action: entity_action },
} satisfies Mapping.Config;
