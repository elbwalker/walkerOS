import type { Normalizer } from '@walkeros/server-core';

/**
 * Reddit's email canonicalization: trimmed and lowercased, then the `+alias`
 * and the dots removed from the part before the `@`.
 */
function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 0) return email;

  const local = email.slice(0, at);
  const alias = local.indexOf('+');
  const user = (alias < 0 ? local : local.slice(0, alias)).replace(/\./g, '');
  return `${user}@${email.slice(at + 1)}`;
}

/** Reddit's phone canonicalization: no extension, digits only, a leading +. */
function normalizePhone(value: string): string {
  const digits = value.split(/ext|x|#/i)[0].replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

/**
 * The user keys Reddit hashes, with the canonical form Reddit documents
 * before hashing. user_agent and every other key are sent as mapped.
 * https://ads-api.reddit.com/docs/v3/guides/programs/capi/direct-integration
 */
export const normalizers = {
  email: normalizeEmail,
  external_id: (value) => value,
  ip_address: (value) => value,
  phone_number: normalizePhone,
  idfa: (value) => value.trim().toUpperCase(),
  aaid: (value) => value.trim().toLowerCase(),
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** Reddit takes one value per user key, never a list. */
export const oneValue: HashKey[] = [
  'email',
  'external_id',
  'ip_address',
  'phone_number',
  'idfa',
  'aaid',
];
