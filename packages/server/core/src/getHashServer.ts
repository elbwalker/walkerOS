import { createHash } from 'crypto';

export interface HashOptions {
  algorithm?: 'sha256' | 'md5';
}

async function digest(message: string, algorithm: string): Promise<string> {
  const hash = createHash(algorithm);
  hash.update(message);
  return hash.digest('hex');
}

export async function getHashServer(
  str: string,
  length?: number,
  options: HashOptions = {},
): Promise<string> {
  const algorithm = options.algorithm ?? 'sha256';
  return (await digest(str, algorithm)).slice(0, length);
}
