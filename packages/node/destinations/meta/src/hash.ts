import { WalkerOS } from '@walkerOS/types';
import { isArray, isObject, isString } from '@walkerOS/utils';
import { getHashNode } from '@walkerOS/node-collector';

const keysToHash = [
  'em',
  'ph',
  'fn',
  'ln',
  'db',
  'ge',
  'ct',
  'st',
  'zp',
  'country',
  'external_id',
];

function shouldBeHashed(key: string, doNotHash: string[] = []): boolean {
  return keysToHash.includes(key) && !doNotHash.includes(key);
}

type HashableValue = WalkerOS.AnyObject | unknown | unknown[];

async function processValue(
  value: unknown,
  shouldHash: boolean,
): Promise<unknown> {
  if (!shouldHash) return value;
  if (isArray(value)) {
    return Promise.all(value.map((item) => getHashNode(String(item))));
  }
  return getHashNode(String(value));
}

export async function hashEvent<T extends HashableValue>(
  value: T,
  doNotHash: string[] = [],
): Promise<T> {
  if (!isObject(value)) return value;

  const isUserData = 'user_data' in value;
  const target = (isUserData ? value.user_data : value) as WalkerOS.AnyObject;

  const entries = await Promise.all(
    Object.entries(target).map(async ([k, v]) => [
      k,
      await processValue(v, isUserData && shouldBeHashed(k, doNotHash)),
    ]),
  );

  const result = entries.reduce((acc, [k, v]) => {
    if (isString(k)) acc[k] = v;
    return acc;
  }, {} as WalkerOS.AnyObject);

  return isUserData ? { ...value, user_data: result } : (result as T);
}
