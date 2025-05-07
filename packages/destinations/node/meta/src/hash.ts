import { WalkerOS } from '@elbwalker/types';
import { isArray, isObject, isString } from '@elbwalker/utils';
import { getHashNode } from '@elbwalker/utils/node';

type HashableValue = WalkerOS.AnyObject | unknown | unknown[];

export async function hashEvent<T extends HashableValue>(
  value: T,
  keysToIgnore: string[] = [],
  key?: string,
  path: string = '',
): Promise<T> {
  if (isObject(value)) {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => {
        const currentPath = path ? `${path}.${k}` : k;
        return [
          k,
          await hashEvent(v as HashableValue, keysToIgnore, k, currentPath),
        ];
      }),
    );

    return entries.reduce(
      (acc, [k, v]) => (isString(k) ? { ...acc, [k]: v } : acc),
      {},
    ) as T;
  }

  if (isArray(value)) {
    return Promise.all(
      value.map((item) =>
        hashEvent(item as HashableValue, keysToIgnore, key, path),
      ),
    ) as Promise<T>;
  }

  if (isString(value) && path && shouldBeHashed(path, keysToIgnore)) {
    return getHashNode(value) as Promise<T>;
  }

  return value;
}

const keysToHash = [
  'user_data.em',
  'user_data.ph',
  'user_data.fn',
  'user_data.ln',
  'user_data.db',
  'user_data.ge',
  'user_data.ct',
  'user_data.st',
  'user_data.zp',
  'user_data.country',
  'user_data.external_id',
];

function shouldBeHashed(key: string, keysToIgnore: string[] = []): boolean {
  return keysToHash.includes(key) && !keysToIgnore.includes(key);
}
