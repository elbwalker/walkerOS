import type { Normalizer } from '@walkeros/server-core';

// The user data keys X requires hashed, sent as hashed_email and
// hashed_phone_number. The phone number is only trimmed, so map it in E.164.
export const normalizers = {
  email: (value) => value.trim().toLowerCase(),
  phone: (value) => value.trim(),
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** X takes one email and one phone number, never a list. */
export const oneValue: HashKey[] = ['email', 'phone'];
