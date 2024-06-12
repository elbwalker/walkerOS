import { createHash } from 'crypto';

async function sha256(message: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(message);
  return hash.digest('hex');
}

export async function getHashNode(
  str: string,
  length?: number,
): Promise<string> {
  return (await sha256(str)).slice(0, length);
}
