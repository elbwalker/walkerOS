import type { WalkerOS } from './types';
import { tryCatch } from './tryCatch';
import { castValue } from './castValue';
import { isArray, isObject } from './is';

/**
 * Converts a request string to a data object.
 *
 * @param parameter The request string to convert.
 * @returns The data object or undefined.
 */
export function requestToData(
  parameter: unknown,
): WalkerOS.AnyObject | undefined {
  const str = String(parameter);
  const queryString = str.split('?')[1] || str;

  return tryCatch(() => {
    const params = new URLSearchParams(queryString);
    const result: WalkerOS.AnyObject = {};

    params.forEach((value, key) => {
      const keys = key.split(/[[\]]+/).filter(Boolean);
      let current: unknown = result;

      keys.forEach((k, i) => {
        const isLast = i === keys.length - 1;

        if (isArray(current)) {
          const index = parseInt(k, 10);
          if (isLast) {
            (current as Array<unknown>)[index] = castValue(value);
          } else {
            (current as Array<unknown>)[index] =
              (current as Array<unknown>)[index] ||
              (isNaN(parseInt(keys[i + 1], 10)) ? {} : []);
            current = (current as Array<unknown>)[index];
          }
        } else if (isObject(current)) {
          if (isLast) {
            (current as WalkerOS.AnyObject)[k] = castValue(value);
          } else {
            (current as WalkerOS.AnyObject)[k] =
              (current as WalkerOS.AnyObject)[k] ||
              (isNaN(parseInt(keys[i + 1], 10)) ? {} : []);
            current = (current as WalkerOS.AnyObject)[k];
          }
        }
      });
    });

    return result;
  })();
}

/**
 * Converts a data object to a request string.
 *
 * @param data The data object to convert.
 * @returns The request string.
 */
export function requestToParameter(
  data: WalkerOS.AnyObject | WalkerOS.PropertyType,
): string {
  if (!data) return '';

  const params: string[] = [];
  const encode = encodeURIComponent;

  function addParam(key: string, value: unknown) {
    if (value === undefined || value === null) return;

    if (isArray(value)) {
      value.forEach((item, index) => addParam(`${key}[${index}]`, item));
    } else if (isObject(value)) {
      Object.entries(value).forEach(([subKey, subValue]) =>
        addParam(`${key}[${subKey}]`, subValue),
      );
    } else {
      params.push(`${encode(key)}=${encode(String(value))}`);
    }
  }

  if (typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => addParam(key, value));
  } else {
    return encode(data);
  }

  return params.join('&');
}
