import { createHash, createHmac } from 'crypto';

export interface HashOptions {
  algorithm?: 'sha256' | 'md5';
  /** Secret key. When set, the hash is an HMAC and cannot be recomputed without it. */
  key?: string;
}

async function digest(
  message: string,
  algorithm: string,
  key?: string,
): Promise<string> {
  const hash =
    key === undefined ? createHash(algorithm) : createHmac(algorithm, key);
  hash.update(message);
  return hash.digest('hex');
}

export async function getHashServer(
  str: string,
  length?: number,
  options: HashOptions = {},
): Promise<string> {
  const algorithm = options.algorithm ?? 'sha256';
  return (await digest(str, algorithm, options.key)).slice(0, length);
}
