import type { WalkerOS } from '@elbwalker/types';
import type { EventConfig, ParametersEcommerce } from './types';
import { getMappingValue, hasValue, isNumber } from '@elbwalker/utils';

export function getEcommerceParams(
  event: WalkerOS.Event,
  eventConfig: EventConfig,
): ParametersEcommerce {
  const params: ParametersEcommerce = {};

  const id = getMappingValue(event, eventConfig.id);
  if (hasValue(id)) params['ep.transaction_id'] = String(id);

  const value = getMappingValue(event, eventConfig.value);
  if (isNumber(value)) params['epn.value'] = value;

  // transaction_id
  // tax
  // shipping
  // coupon

  return params;
}
