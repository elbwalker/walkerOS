import type { UserData } from './types';
import { getHashServer } from '@walkeros/server-core';

const keysToHash = ['email', 'phone_number', 'external_id'];

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
