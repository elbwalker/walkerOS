import type { WalkerOS } from '@elbwalker/types';
import { assign, castValue, isSameType, tryCatch } from '../';

export type SendDataValue = WalkerOS.Property | WalkerOS.Properties;
export type SendHeaders = { [key: string]: string };

export interface SendResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export function transformData(data: SendDataValue): string {
  return isSameType(data, '' as string) ? data : JSON.stringify(data);
}

export function getHeaders(headers: SendHeaders = {}): SendHeaders {
  return assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
    },
    headers,
  );
}

export function createRequestURL(url: string, data: SendDataValue): string {
  const params = new URLSearchParams();
  let queryString = '';

  function addParam(key: string, value: unknown) {
    if (!value && value !== false && value !== 0) return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => addParam(`${key}[${index}]`, item));
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) =>
        addParam(`${key}[${subKey}]`, subValue),
      );
    } else {
      params.append(key, String(value));
    }
  }

  if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => addParam(key, value));
  } else if (data !== undefined && data !== null) {
    queryString = String(data);
  }

  queryString = queryString || params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export function parseRequestURL(url: string): WalkerOS.AnyObject | undefined {
  const [, queryString] = url.split('?');
  if (!queryString) return;

  return tryCatch(() => {
    const params = new URLSearchParams(queryString);
    const result: WalkerOS.AnyObject = {};

    params.forEach((value, key) => {
      const keys = key.split(/[[\]]+/).filter(Boolean);
      let current: unknown = result;

      keys.forEach((k, i) => {
        const isLast = i === keys.length - 1;

        if (Array.isArray(current)) {
          const index = parseInt(k, 10);
          if (isLast) {
            (current as Array<unknown>)[index] = castValue(value);
          } else {
            (current as Array<unknown>)[index] =
              (current as Array<unknown>)[index] ||
              (isNaN(parseInt(keys[i + 1], 10)) ? {} : []);
            current = (current as Array<unknown>)[index];
          }
        } else if (typeof current === 'object' && current !== null) {
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
