import type { UserData } from './types';
import { getHashServer } from '@walkeros/server-core';

const SHA256_HEX = /^[a-f0-9]{64}$/;

// Normalised as TikTok expects before hashing.
const normalize: Record<string, (value: string) => string> = {
  email: (value) => value.trim().toLowerCase(),
  phone: (value) => value.replace(/[^\d+]/g, ''),
  external_id: (value) => value.trim(),
};

/**
 * Hashes email, phone and external_id with SHA-256 after normalisation.
 * `phone_number` is renamed to `phone`, the Events API 2.0 key. An existing
 * SHA-256 hex digest is kept as it is.
 */
export async function hashUserData(
  userData: UserData,
  doNotHash: string[] = [],
): Promise<UserData> {
  const result: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(userData)) {
    if (value === undefined || value === null || value === '') continue;
    const key = rawKey === 'phone_number' ? 'phone' : rawKey;
    const normalizer = normalize[key];
    const skip = doNotHash.includes(rawKey) || doNotHash.includes(key);
    if (!normalizer || skip) {
      result[key] = value;
      continue;
    }
    const normalized = normalizer(String(value));
    result[key] = SHA256_HEX.test(normalized)
      ? normalized
      : await getHashServer(normalized);
  }
  return result as UserData;
}
