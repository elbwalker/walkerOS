import type { Normalizer } from '@walkeros/server-core';

/**
 * Microsoft-specific email normalization:
 * - Trim whitespace
 * - Lowercase
 * - Split at `@`
 * - Remove dots from the user portion
 * - Strip `+alias` suffix from the user portion
 * - Rejoin
 */
function normalizeEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex < 0) return trimmed;

  const user = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  const aliasIndex = user.indexOf('+');
  const beforeAlias = aliasIndex < 0 ? user : user.slice(0, aliasIndex);
  const normalizedUser = beforeAlias.replace(/\./g, '');

  return `${normalizedUser}@${domain}`;
}

/**
 * The userData keys Microsoft requires hashed. All other identity fields
 * (anonymousId, externalId, msclkid, clientIpAddress, clientUserAgent, idfa,
 * gaid) are sent as mapped.
 * https://learn.microsoft.com/en-us/advertising/guides/uet-conversion-api-integration
 */
export const normalizers = {
  em: normalizeEmail,
  ph: (value) => value.trim(),
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** Microsoft takes one em and one ph, never a list. */
export const oneValue: HashKey[] = ['em', 'ph'];
