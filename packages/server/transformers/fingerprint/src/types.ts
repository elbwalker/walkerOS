import type { Mapping } from '@walkeros/core';

/**
 * Fingerprint transformer settings.
 *
 * Without `fields`, the hash is built from the named inputs `ip`,
 * `userAgent` and `site`, each reduced before hashing. With `fields`, only
 * the fields are hashed, plus any named input set explicitly.
 */
export interface FingerprintSettings {
  /**
   * Secret key for the hash (HMAC), e.g. "$env.FINGERPRINT_SALT".
   * Without it the hash can be reversed to the IP by brute force; the
   * transformer then warns once and hashes unkeyed.
   */
  salt?: string;

  /**
   * Rotation window in UTC. The same visitor gets a new hash each window.
   * @default 'daily'
   */
  rotate?: 'daily' | 'hourly' | 'none';

  /**
   * Client IP, anonymized to /24 (IPv4) or /48 (IPv6) before hashing.
   * `false` switches it off.
   * @default 'ingest.ip' (only when `fields` is not set)
   */
  ip?: Mapping.Value | false;

  /**
   * User agent, reduced to browser, major version and OS before hashing.
   * `false` switches it off.
   * @default 'ingest.userAgent' (only when `fields` is not set)
   */
  userAgent?: Mapping.Value | false;

  /**
   * Site the visitor is on, so one visitor gets different hashes on
   * different sites. A URL is reduced to its hostname. Use an ingest path
   * (e.g. 'ingest.property') or a static `{ value: 'example.com' }` when
   * events carry no page URL. `false` switches it off.
   * @default 'event.source.url' (only when `fields` is not set)
   */
  site?: Mapping.Value | false;

  /**
   * Extra fields to include in the hash (order matters!), hashed as resolved.
   * Each field is resolved via getMappingValue with source object { event, ingest }.
   *
   * String fields use dot notation:
   * - 'ingest.ip' -> context.ingest.ip
   * - 'event.data.userId' -> event.data.userId
   *
   * Function fields via mapping config:
   * - { fn: ({ ingest }) => ingest.region } -> computed value
   *   (fn receives { event, ingest }; a fn next to a key never runs)
   */
  fields?: Mapping.Value[];

  /**
   * Dot-notation path where hash is stored on the event.
   * @default 'user.hash'
   */
  output?: string;

  /**
   * Truncate hash to this length.
   * @default undefined (full 64-char SHA-256 hash)
   */
  length?: number;
}
