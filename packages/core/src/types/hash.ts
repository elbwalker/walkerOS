/**
 * Settings of a destination that hashes user data keys before sending, for
 * the keys K it hashes.
 */
export interface HashSettings<K extends string = string> {
  /** Keys sent as mapped: their values must already be SHA-256 digests. */
  doNotHash?: K[];
}
