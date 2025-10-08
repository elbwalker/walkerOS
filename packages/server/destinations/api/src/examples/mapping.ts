import type { Mapping } from '@walkeros/core';
import type { Rule, Rules } from '../types';

export const entity_action: Rule = {
  data: 'data',
};

export const config = {
  entity: { action: entity_action },
} satisfies Rules;
