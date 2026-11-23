import type { Normalizer } from '@walkeros/server-core';

const asMapped: Normalizer = (value) => value;

/**
 * The user_data keys Snapchat requires hashed. Their values are hashed as
 * mapped, without normalizing them.
 * https://developers.snap.com/api/marketing-api/Conversions-API/Parameters
 */
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
} satisfies Record<string, Normalizer>;

export type HashKey = keyof typeof normalizers;

/** Snapchat takes one external_id, never a list. */
export const oneValue: HashKey[] = ['external_id'];
