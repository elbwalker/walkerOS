import type { Mapping } from '.';

/**
 * Declarative store operation. Replaces `$code:` for simple fetch/stash.
 * key = store side, value = event side, mode = direction.
 */
export interface State {
  /** Direction. 'delete' is reserved for a later release. */
  mode: 'get' | 'set';
  /** Store id; defaults to the in-memory `__cache` store when omitted. */
  store?: string;
  /** Resolves against the event to the store key. */
  key: Mapping.Value;
  /**
   * set: resolves to the payload to store.
   * get: its `key`/bare-string path is the event write-target.
   * Optional at the type level to keep a future `delete` mode non-breaking;
   * validation requires it for get/set.
   */
  value?: Mapping.Value;
}
