import { createHash } from 'crypto';
import { getHashServer } from '@walkeros/server-core';
import type { CriteoEmailHashes } from './types';

/**
 * Criteo Events API expects email in three hashed forms:
 * - md5: MD5 of lowercased/trimmed email
 * - sha256: SHA-256 of lowercased/trimmed email
 * - sha256_md5: SHA-256 of the MD5 hash (hex string)
 *
 * https://guides.criteotilt.com/events-api/
 */

/** MD5 hex digest of the lowercased/trimmed input */
export function hashMD5(value: string): string {
  return createHash('md5').update(value.toLowerCase().trim()).digest('hex');
}

const sha256HexPattern = /^[a-f0-9]{64}$/;
const md5HexPattern = /^[a-f0-9]{32}$/;

function isSha256Hex(value: string): boolean {
  return sha256HexPattern.test(value);
}

function isMd5Hex(value: string): boolean {
  return md5HexPattern.test(value);
}

/**
 * Hash an email address into Criteo's three expected forms.
 * If the input already looks like a SHA-256 hex string, it is not re-hashed.
 * If the input looks like an MD5 hex string, it is used directly as md5.
 */
export async function hashEmail(email: string): Promise<CriteoEmailHashes> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return {};

  // Already SHA-256 hashed — can't derive md5 from it, only pass through.
  if (isSha256Hex(normalized)) {
    return { sha256: normalized };
  }

  // Already MD5 hashed — derive sha256_md5 from it, can't derive sha256.
  if (isMd5Hex(normalized)) {
    const sha256_md5 = await getHashServer(normalized);
    return { md5: normalized, sha256_md5 };
  }

  const md5 = hashMD5(normalized);
  const sha256 = await getHashServer(normalized);
  const sha256_md5 = await getHashServer(md5);
  return { md5, sha256, sha256_md5 };
}
