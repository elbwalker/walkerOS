import { isArray, isString } from '@walkeros/core';
import { getHashServer } from './getHashServer';

/** Brings a value into the form a vendor hashes, such as a lowercase email. */
export type Normalizer = (value: string) => string;

export interface HashedUserData {
  /** The user data to send. */
  userData: Record<string, unknown>;
  /** Keys that take one value but got a list: left out, for the caller to report. */
  dropped: string[];
}

/**
 * Hashes the user data keys a vendor requires hashed. Under a key with a
 * normalizer, an undefined, null or '' value is left out; unless the key is
 * listed in doNotHash, the value is normalized and SHA-256 hashed, a list item
 * by item, and left out when it normalizes to ''. A doNotHash value, and every
 * value under a key without a normalizer, is sent as mapped. A list under a
 * key in oneValue, which the vendor takes as one value, is left out and
 * returned in dropped.
 */
export async function hashUserData(
  userData: object,
  normalizers: Readonly<Record<string, Normalizer>>,
  doNotHash: readonly string[] = [],
  oneValue: readonly string[] = [],
): Promise<HashedUserData> {
  const dropped: string[] = [];
  const entries = await Promise.all(
    Object.entries(userData).map(
      async ([key, value]: [string, unknown]): Promise<[string, unknown]> => {
        if (isArray(value) && oneValue.includes(key)) {
          dropped.push(key);
          return [key, undefined];
        }
        if (!Object.hasOwn(normalizers, key)) return [key, value];
        if (isEmpty(value)) return [key, undefined];
        if (doNotHash.includes(key)) return [key, value];
        return [key, await hashValues(value, normalizers[key])];
      },
    ),
  );

  return {
    userData: Object.fromEntries(
      entries.filter(([, value]) => value !== undefined),
    ),
    dropped,
  };
}

async function hashValues(
  value: unknown,
  normalize: Normalizer,
): Promise<string | string[] | undefined> {
  if (!isArray(value)) return hashValue(value, normalize);

  const hashed = await Promise.all(
    value.map((item) => hashValue(item, normalize)),
  );
  const list = hashed.filter(isString);
  return list.length ? list : undefined;
}

async function hashValue(
  value: unknown,
  normalize: Normalizer,
): Promise<string | undefined> {
  if (isEmpty(value)) return;
  const normalized = normalize(String(value));
  return normalized ? getHashServer(normalized) : undefined;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}
