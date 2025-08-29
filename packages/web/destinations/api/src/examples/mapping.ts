import type { Mapping } from '@walkeros/core';
import type { DestinationAPI } from '..';

export const entity_action: DestinationAPI.Rule = {
  data: 'data',
};

export const config = {
  entity: { action: entity_action },
} satisfies DestinationAPI.Rules;
