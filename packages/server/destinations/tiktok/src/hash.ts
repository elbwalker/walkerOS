import type { HashedUserData, Normalizer } from '@walkeros/server-core';
import type { UserData } from './types';
import { hashUserData } from '@walkeros/server-core';

// The user keys TikTok requires SHA-256 hashed, with the normalization it
// documents before hashing:
// https://business-api.tiktok.com/portal/docs?id=1771101151059969
export const normalizers = {
  email: (value) => value.trim().toLowerCase(),
  phone: (value) => value.replace(/[^\d+]/g, ''),
  external_id: (value) => value.trim(),
} satisfies Record<string, Normalizer>;

/** `phone_number` is accepted as a key for `phone`, the key TikTok takes. */
const phoneKey = (key: string) => (key === 'phone_number' ? 'phone' : key);

/** The keys doNotHash takes: the hashed keys and `phone_number`. */
export const doNotHashKeys = [...Object.keys(normalizers), 'phone_number'];

export type HashKey = keyof typeof normalizers | 'phone_number';

/**
 * Hashes the user data the way TikTok requires, with `phone_number` sent as
 * `phone`. A mapped `phone` wins over `phone_number`, and `phone_number` in
 * doNotHash applies to `phone`.
 */
export function hashUser(
  userData: UserData,
  doNotHash: readonly HashKey[] = [],
): Promise<HashedUserData> {
  const { phone_number, ...user } = userData;
  return hashUserData(
    { ...user, phone: user.phone ?? phone_number },
    normalizers,
    doNotHash.map(phoneKey),
  );
}
