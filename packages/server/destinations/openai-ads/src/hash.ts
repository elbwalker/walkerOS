import { getHashServer } from '@walkeros/server-core';

const SHA256_HEX = /^[a-f0-9]{64}$/;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

// Digits with country code, no leading + or zeroes.
export const normalizePhone = (value: string) =>
  value
    .replace(/[\s().-]/g, '')
    .replace(/^\+/, '')
    .replace(/^0+/, '');

export const normalizeExternalId = (value: string) => value.trim();

/** Values from a string or a list, without empty ones. */
export function toList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map((item) => String(item));
}

/**
 * Normalised and SHA-256 hashed, unless the value already is a SHA-256 hex
 * digest. Deduplicated, at most three values (the API limit per field).
 */
export async function hashList(
  value: unknown,
  normalize: (value: string) => string,
): Promise<string[] | undefined> {
  const hashed = await Promise.all(
    toList(value).map(async (item) => {
      const digest = item.trim().toLowerCase();
      if (SHA256_HEX.test(digest)) return digest;
      return getHashServer(normalize(item));
    }),
  );
  const unique = [...new Set(hashed)].slice(0, 3);
  return unique.length ? unique : undefined;
}
