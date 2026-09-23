import type { Mapping } from '.';

/**
 * Declarative store operation. Replaces `$code:` for simple fetch/stash.
 * key names the store slot, value the event or ingest side, mode the
 * direction. Paths resolve against `{ event, ingest }`: `event.user.session`,
 * `ingest.site`.
 */
export interface State {
  /** Direction. 'delete' is reserved for a later release. */
  mode: 'get' | 'set';
  /** Store id; defaults to the in-memory `__cache` store when omitted. */
  store?: string;
  /** Resolves against `{ event, ingest }` to the store key. */
  key: Mapping.Value;
  /**
   * set: resolves against `{ event, ingest }` to the payload to store.
   * get: its string path (or `key`) is the write target, `event.` onto the
   * event or `ingest.` into the ingest.
   * Optional at the type level to keep a future `delete` mode non-breaking;
   * validation requires it for get/set.
   */
  value?: Mapping.Value;
}
