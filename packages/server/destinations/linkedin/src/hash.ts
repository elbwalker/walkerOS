import type { Normalizer } from '@walkeros/server-core';

// The user data key LinkedIn requires hashed, sent as SHA256_EMAIL
export const normalizers = {
  email: (value) => value.trim().toLowerCase(),
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** LinkedIn takes one email, never a list. */
export const oneValue: HashKey[] = ['email'];
