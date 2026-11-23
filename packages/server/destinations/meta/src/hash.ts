import type { Logger } from '@walkeros/core';
import type { Normalizer } from '@walkeros/server-core';

const trimLower: Normalizer = (value) => value.trim().toLowerCase();

const lettersAndNumbers: Normalizer = (value) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

const name: Normalizer = (value) =>
  value.toLowerCase().replace(/\p{P}/gu, '').trim();

const birthDate: Normalizer = (value) => {
  const date = value.trim();
  return /^\d{4}\p{P}?\d{2}\p{P}?\d{2}$/u.test(date)
    ? date.replace(/\D/g, '')
    : date;
};

// The user_data keys Meta requires hashed, with the formatting rules applied
// before hashing:
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
export const normalizers = {
  em: trimLower,
  ph: (value) => value.replace(/\D/g, '').replace(/^0+/, ''),
  fn: name,
  ln: name,
  db: birthDate,
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
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** The normalizers, with a WARN line for a date of birth that cannot match. */
export function getNormalizers(
  logger: Logger.Instance,
): Record<HashKey, Normalizer> {
  return {
    ...normalizers,
    db: (value) => {
      const date = birthDate(value);
      if (!/^\d{8}$/.test(date))
        logger.warn(
          'Meta user_data db is not YYYYMMDD after normalization and cannot match',
        );
      return date;
    },
  };
}
