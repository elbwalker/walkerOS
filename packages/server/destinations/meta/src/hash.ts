import type { Logger, WalkerOS } from '@walkeros/core';
import { isArray, isObject, isString } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';

type Normalizer = (value: string) => string;

const trimLower: Normalizer = (value) => value.trim().toLowerCase();

const lettersAndNumbers: Normalizer = (value) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

const name: Normalizer = (value) =>
  value.toLowerCase().replace(/\p{P}/gu, '').trim();

// Formatting rules per key, applied before hashing:
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
const normalizers: Record<string, Normalizer> = {
  em: trimLower,
  ph: (value) => value.replace(/\D/g, '').replace(/^0+/, ''),
  fn: name,
  ln: name,
  db: (value) => {
    const date = value.trim();
    return /^\d{4}\p{P}?\d{2}\p{P}?\d{2}$/u.test(date)
      ? date.replace(/\D/g, '')
      : date;
  },
  ge: (value) => trimLower(value).charAt(0),
  ct: lettersAndNumbers,
  st: lettersAndNumbers,
  zp: (value) => {
    const zip = trimLower(value);
    if (/^\d{5}[\s-]?\d{4}$/.test(zip)) return zip.slice(0, 5);
    return zip.replace(/[\s-]/g, '');
  },
  country: trimLower,
  external_id: (value) => value,
};

// Keys listed in doNotHash are sent exactly as mapped, without normalization
function getNormalizer(
  key: string,
  doNotHash: string[] = [],
): Normalizer | undefined {
  if (!Object.hasOwn(normalizers, key) || doNotHash.includes(key)) return;
  return normalizers[key];
}

function hashValue(
  key: string,
  value: unknown,
  normalize: Normalizer,
  logger?: Logger.Instance,
): Promise<string> {
  const normalized = normalize(String(value));
  if (key === 'db' && !/^\d{8}$/.test(normalized))
    logger?.warn(
      'Meta user_data db is not YYYYMMDD after normalization and cannot match',
    );
  return getHashServer(normalized);
}

type HashableValue = WalkerOS.AnyObject | unknown | unknown[];

async function processValue(
  key: string,
  value: unknown,
  normalize?: Normalizer,
  logger?: Logger.Instance,
): Promise<unknown> {
  if (!normalize) return value;
  if (isArray(value)) {
    return Promise.all(
      value.map((item) => hashValue(key, item, normalize, logger)),
    );
  }
  return hashValue(key, value, normalize, logger);
}

export async function hashEvent<T extends HashableValue>(
  value: T,
  doNotHash: string[] = [],
  logger?: Logger.Instance,
): Promise<T> {
  if (!isObject(value)) return value;

  const isUserData = 'user_data' in value;
  const target = (isUserData ? value.user_data : value) as WalkerOS.AnyObject;

  const entries = await Promise.all(
    Object.entries(target).map(async ([k, v]) => [
      k,
      await processValue(
        k,
        v,
        isUserData ? getNormalizer(k, doNotHash) : undefined,
        logger,
      ),
    ]),
  );

  const result = entries.reduce((acc, [k, v]) => {
    if (isString(k)) acc[k] = v;
    return acc;
  }, {} as WalkerOS.AnyObject);

  return isUserData ? { ...value, user_data: result } : (result as T);
}
