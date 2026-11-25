import type { Normalizer } from '@walkeros/server-core';

// Lowercase, without whitespace and ASCII punctuation; other characters stay.
const name: Normalizer = (value) =>
  value.toLowerCase().replace(/[\s\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/g, '');

// Digits with the country calling code, without a leading + or zeroes.
const phone: Normalizer = (value) =>
  value
    .replace(/[\s().-]/g, '')
    .replace(/^\+/, '')
    .replace(/^0+/, '');

/**
 * The mapped keys OpenAI requires hashed, with OpenAI's normalization:
 * https://developers.openai.com/ads/conversions-api#send-user-data
 */
export const normalizers = {
  email: (value) => value.trim().toLowerCase(),
  phone,
  external_id: (value) => value.trim(),
  first_name: name,
  last_name: name,
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

export const hashKeys = Object.keys(normalizers).filter((key): key is HashKey =>
  Object.hasOwn(normalizers, key),
);

/** The user field OpenAI takes each hashed key's digests in. */
export const hashedFields = {
  email: 'emails_sha256',
  phone: 'phone_numbers_sha256',
  external_id: 'external_ids_sha256',
  first_name: 'first_names_sha256',
  last_name: 'last_names_sha256',
} as const satisfies Record<HashKey, string>;

/**
 * The normalizers, with a phone that is not 8 to 15 digits after
 * normalization left out (it cannot match) and passed to `invalid`.
 */
export function getNormalizers(
  invalid: (key: HashKey) => void,
): Record<HashKey, Normalizer> {
  return {
    ...normalizers,
    phone: (value) => {
      const digits = phone(value);
      if (/^\d{8,15}$/.test(digits)) return digits;
      invalid('phone');
      return '';
    },
  };
}
