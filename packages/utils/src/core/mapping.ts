import type { WalkerOS } from '@elbwalker/types';
import { castToProperty, getByStringDot } from '.';

interface MappingObject {
  key?: string;
  defaultValue?: WalkerOS.PropertyType;
}

export function getMappingValue(
  event: WalkerOS.Event,
  mapping: WalkerOS.MappingValue,
): WalkerOS.Property | undefined {
  const obj = getMappingObject(mapping);
  if (obj.key)
    return castToProperty(getByStringDot(event, obj.key, obj.defaultValue));

  return obj.defaultValue;
}

function getMappingObject(param: WalkerOS.MappingValue): MappingObject {
  let key: string | undefined;
  let defaultValue: WalkerOS.PropertyType | undefined;

  if (typeof param == 'string') {
    key = param;
  } else {
    key = param.key;
    defaultValue = param.default;
  }

  return { key, defaultValue };
}
