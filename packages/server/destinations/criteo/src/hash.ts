import type { Normalizer } from '@walkeros/server-core';

// The user_data key Criteo requires hashed, sent as id.email
export const normalizers = {
  email: (value) => value.toLowerCase().trim(),
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** Criteo takes one email, never a list. */
export const oneValue: HashKey[] = ['email'];
