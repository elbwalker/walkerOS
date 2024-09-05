import type { WalkerOS } from '@elbwalker/types';
import type { EventConfig, ParametersEcommerce } from './types';
import { getMappingValue, isNumber } from '@elbwalker/utils';

export function getEcommerceParams(
  event: WalkerOS.Event,
  eventConfig: EventConfig,
): ParametersEcommerce {
  const params: ParametersEcommerce = {};

  const value = getMappingValue(event, eventConfig.value);
  if (isNumber(value)) params['epn.value'] = value;

  // transaction_id
  // tax
  // shipping
  // coupon

  return params;
}
