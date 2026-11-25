import type { Normalizer } from '@walkeros/server-core';

const asMapped: Normalizer = (value) => value;

// The user_data keys Pinterest requires hashed. Their values are hashed as
// mapped, without normalizing them.
export const normalizers = {
  em: asMapped,
  ph: asMapped,
  fn: asMapped,
  ln: asMapped,
  db: asMapped,
  ge: asMapped,
  ct: asMapped,
  st: asMapped,
  zp: asMapped,
  country: asMapped,
  external_id: asMapped,
  hashed_maids: asMapped,
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;
