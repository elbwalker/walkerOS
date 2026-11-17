import { WalkerOS } from '@walkeros/core';
import { isArray, isObject, isString } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';

// user_agent is matched in clear by Reddit: never hashed.
const keysToHash = ['email', 'external_id', 'ip_address', 'idfa', 'aaid'];

const SHA256_HEX = /^[a-f0-9]{64}$/;

// Trimmed and lowercased before hashing; an existing SHA-256 digest is kept.
async function hashOne(item: unknown): Promise<string> {
  const normalized = String(item).trim().toLowerCase();
  return SHA256_HEX.test(normalized) ? normalized : getHashServer(normalized);
}

function shouldBeHashed(key: string, doNotHash: string[] = []): boolean {
  return keysToHash.includes(key) && !doNotHash.includes(key);
}

type HashableValue = WalkerOS.AnyObject | unknown | unknown[];

async function processValue(
  value: unknown,
  shouldHash: boolean,
): Promise<unknown> {
  if (!shouldHash) return value;
  if (isArray(value)) {
    return Promise.all(value.map(hashOne));
  }
  return hashOne(value);
}

export async function hashEvent<T extends HashableValue>(
  value: T,
  doNotHash: string[] = [],
): Promise<T> {
  if (!isObject(value)) return value;

  const isUser = 'user' in value;
  const target = (isUser ? value.user : value) as WalkerOS.AnyObject;

  const entries = await Promise.all(
    Object.entries(target).map(async ([k, v]) => [
      k,
      await processValue(v, isUser && shouldBeHashed(k, doNotHash)),
    ]),
  );

  const result = entries.reduce((acc, [k, v]) => {
    if (isString(k)) acc[k] = v;
    return acc;
  }, {} as WalkerOS.AnyObject);

  return isUser ? { ...value, user: result } : (result as T);
}
