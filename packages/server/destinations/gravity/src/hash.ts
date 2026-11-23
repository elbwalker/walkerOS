import type { Normalizer } from '@walkeros/server-core';

const trimLower: Normalizer = (value) => value.trim().toLowerCase();

// The user_data keys Gravity hashes for storage, with the rules applied before
// hashing: "Before you hash, trim and lowercase emails, and keep only the
// digits of phone numbers."
// https://docs.trygravity.com/advertisers/server-conversions
// Gravity states no rule for names, so fn and ln are trimmed and lowercased.
export const normalizers = {
  em: trimLower,
  ph: (value) => value.replace(/\D/g, ''),
  fn: trimLower,
  ln: trimLower,
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** Gravity takes one fn and one ln, never a list. */
export const oneValue: HashKey[] = ['fn', 'ln'];
