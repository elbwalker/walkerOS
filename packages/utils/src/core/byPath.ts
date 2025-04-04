import { WalkerOS } from '@elbwalker/types';
import { isArray, isDefined } from './is';

export function getByPath(
  event: unknown,
  key: string = '',
  defaultValue?: unknown,
  i: unknown = 0,
): unknown {
  // String dot notation for object ("data.id" -> { data: { id: 1 } })
  const keys = key.split('.');
  let values: unknown = event;

  for (let index = 0; index < keys.length; index++) {
    const k = keys[index];

    if (k === '*' && isArray(values)) {
      const remainingKeys = keys.slice(index + 1).join('.');
      const result: unknown[] = [];

      for (const item of values) {
        const value = getByPath(item, remainingKeys, defaultValue, i);
        result.push(value);
      }

      return result;
    }

    values =
      values instanceof Object ? values[k as keyof typeof values] : undefined;

    if (!values) break;
  }

  return isDefined(values) ? values : defaultValue;
}

export function setByPath(
  event: WalkerOS.Event,
  key: string,
  value: unknown,
): WalkerOS.Event {
  const keys = key.split('.');
  let current: WalkerOS.AnyObject | WalkerOS.Event = event;

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as keyof typeof current;

    // Set the value if it's the last key
    if (i === keys.length - 1) {
      current[k] = value;
    } else {
      // Traverse to the next level
      if (
        !(k in current) ||
        typeof current[k] !== 'object' ||
        current[k] === null
      ) {
        current[k] = {};
      }

      // Move deeper into the object
      current = current[k] as WalkerOS.AnyObject;
    }
  }

  return event;
}
