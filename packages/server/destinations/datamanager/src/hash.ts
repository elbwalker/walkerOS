import { getHashServer } from '@walkeros/server-core';

// Google's formatting rules, https://developers.google.com/data-manager/api/devguides/concepts/formatting
// The guide decides; where it names no rule (the name prefixes and
// suffixes), Google's Node UserDataFormatter does. Each normalizer returns
// undefined for a blank value and for one Google cannot match, so nothing
// is guessed and the caller can say why a value was not sent.

/** A value that already is a SHA-256 digest is sent lowercased, not hashed again. */
const SHA256_HEX = /^[0-9a-f]{64}$/i;

const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];

/** E.164: a plus, a country code that never starts with 0, at most 15 digits. */
const E164 = /^\+[1-9]\d{1,14}$/;
const PHONE_SEPARATORS = /[\s()./-]/g;

const GIVEN_PREFIX = /^(?:mr|mrs|ms|dr)\.(?:\s|$)/;
const FAMILY_SUFFIXES =
  'jr\\.?|sr\\.?|2nd|3rd|ii|iii|iv|v|vi|cpa|dc|dds|vm|jd|md|phd';
const TRAILING_SUFFIX = new RegExp(`(?:,\\s*|\\s+)(?:${FAMILY_SUFFIXES})$`);
const ONLY_SUFFIX = new RegExp(`^(?:${FAMILY_SUFFIXES})$`);

/**
 * Lowercase without any whitespace, exactly one @ with both sides set. For
 * gmail.com and googlemail.com the local part loses its dots and its +alias.
 */
export function normalizeEmail(value: string): string | undefined {
  const parts = value.replace(/\s/g, '').toLowerCase().split('@');
  if (parts.length !== 2) return undefined;
  const [address, domain] = parts;
  const local = GMAIL_DOMAINS.includes(domain)
    ? address.split('+')[0].replace(/\./g, '')
    : address;
  return local && domain ? `${local}@${domain}` : undefined;
}

/**
 * E.164 from a number that carries its country code after + or 00. A number
 * without one is not sent: guessing the country would match someone else.
 */
export function normalizePhone(value: string): string | undefined {
  const trimmed = value.trim();
  const international = trimmed.startsWith('+')
    ? trimmed.slice(1)
    : trimmed.startsWith('00')
      ? trimmed.slice(2)
      : undefined;
  if (international === undefined) return undefined;
  // "(0)" after the country code is the trunk prefix, never dialled from abroad.
  const digits = international
    .replace(/\(0\)/g, '')
    .replace(PHONE_SEPARATORS, '');
  const phone = `+${digits}`;
  return E164.test(phone) ? phone : undefined;
}

/** Lowercase, without one leading Mr., Mrs., Ms. or Dr. followed by a space. */
export function normalizeGivenName(value: string): string | undefined {
  const name = value.trim().toLowerCase().replace(GIVEN_PREFIX, '').trim();
  return name || undefined;
}

/**
 * Lowercase, without trailing suffixes such as Jr. or PhD after a comma or a
 * space. A name that is only a suffix is not sent.
 */
export function normalizeFamilyName(value: string): string | undefined {
  let name = value.trim().toLowerCase();
  while (TRAILING_SUFFIX.test(name))
    name = name.replace(TRAILING_SUFFIX, '').trim();
  return name && !ONLY_SUFFIX.test(name) ? name : undefined;
}

/** Two letters of ISO-3166-1 alpha-2, uppercase; never hashed. */
export function normalizeRegionCode(value: string): string | undefined {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

/** Trimmed; never hashed. */
export function normalizePostalCode(value: string): string | undefined {
  return value.trim() || undefined;
}

/** The SHA-256 of the normalized value, '' when there is none to send. */
async function hashNormalized(
  value: string,
  normalize: (value: string) => string | undefined,
): Promise<string> {
  const trimmed = value.trim();
  if (SHA256_HEX.test(trimmed)) return trimmed.toLowerCase();
  const normalized = normalize(value);
  return normalized ? getHashServer(normalized) : '';
}

export async function hashEmail(email: string): Promise<string> {
  return hashNormalized(email, normalizeEmail);
}

export async function hashPhone(phone: string): Promise<string> {
  return hashNormalized(phone, normalizePhone);
}

export async function hashName(
  name: string,
  type: 'given' | 'family' = 'given',
): Promise<string> {
  return hashNormalized(
    name,
    type === 'given' ? normalizeGivenName : normalizeFamilyName,
  );
}
