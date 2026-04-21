import type { UserData } from './types';
import { getHashServer } from '@walkeros/server-core';

/**
 * Snapchat Conversions API user data fields that must be SHA-256 hashed
 * before sending. Same 11 identity fields as Meta's CAPI.
 * https://businesshelp.snapchat.com/s/article/capi-parameters
 */
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

export async function hashUserData(
  userData: UserData,
  doNotHash: string[] = [],
): Promise<UserData> {
  const entries = await Promise.all(
    Object.entries(userData).map(async ([key, value]) => {
      if (value === undefined) return [key, value];
      if (shouldBeHashed(key, doNotHash)) {
        return [key, await getHashServer(String(value))];
      }
      return [key, value];
    }),
  );

  return Object.fromEntries(entries) as UserData;
}
