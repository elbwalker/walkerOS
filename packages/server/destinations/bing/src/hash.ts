import type { UserData } from './types';
import { getHashServer } from '@walkeros/server-core';

/**
 * Bing UET CAPI user data fields that must be SHA-256 hashed before sending.
 * Only `em` and `ph` are hashable; all other identity fields pass through
 * unhashed (anonymousId, externalId, msclkid, clientIpAddress,
 * clientUserAgent, idfa, gaid).
 * https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking-capi
 */
const keysToHash = ['em', 'ph'];

/**
 * Microsoft-specific email normalization:
 * - Trim whitespace
 * - Lowercase
 * - Split at `@`
 * - Remove dots from the user portion
 * - Strip `+alias` suffix from the user portion
 * - Rejoin
 */
export function normalizeEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex < 0) return trimmed;

  const user = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  const aliasIndex = user.indexOf('+');
  const beforeAlias = aliasIndex < 0 ? user : user.slice(0, aliasIndex);
  const normalizedUser = beforeAlias.replace(/\./g, '');

  return `${normalizedUser}@${domain}`;
}

function normalizePhone(value: string): string {
  return value.trim();
}

function shouldBeHashed(key: string, doNotHash: string[] = []): boolean {
  return keysToHash.includes(key) && !doNotHash.includes(key);
}

function normalizeForKey(key: string, value: string): string {
  if (key === 'em') return normalizeEmail(value);
  if (key === 'ph') return normalizePhone(value);
  return value;
}

export async function hashUserData(
  userData: UserData,
  doNotHash: string[] = [],
): Promise<UserData> {
  const entries = await Promise.all(
    Object.entries(userData).map(async ([key, value]) => {
      if (value === undefined) return [key, value];
      if (shouldBeHashed(key, doNotHash)) {
        const normalized = normalizeForKey(key, String(value));
        return [key, await getHashServer(normalized)];
      }
      return [key, value];
    }),
  );

  return Object.fromEntries(entries) as UserData;
}
