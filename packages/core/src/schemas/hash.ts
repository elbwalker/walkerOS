import { z } from './validation';

/**
 * Hash Settings Schema
 *
 * Mirrors: types/hash.ts
 *
 * The settings of a destination that hashes user data keys before sending.
 * The destination passes the keys it hashes, so validation refuses any other
 * key in doNotHash.
 */
export function createHashSettingsSchema(keys: readonly string[]) {
  return z.object({
    doNotHash: z
      .array(z.enum(keys))
      .describe(
        `Keys sent as mapped, without normalizing and hashing: their values must already be SHA-256 digests (like ['${keys[0]}'])`,
      )
      .optional(),
  });
}
