import type { Mapping } from '@walkeros/core';

/**
 * Fingerprint transformer settings.
 */
export interface FingerprintSettings {
  /**
   * Fields to include in hash (order matters!).
   * Each field is resolved via getMappingValue with source object { event, ingest }.
   *
   * String fields use dot notation:
   * - 'ingest.ip' -> context.ingest.ip
   * - 'ingest.userAgent' -> context.ingest.userAgent
   * - 'event.data.userId' -> event.data.userId
   *
   * Function fields via mapping config:
   * - { fn: () => new Date().getDate() } -> day of month
   * - { key: 'ingest.ip', fn: anonymizeIP } -> transform value
   */
  fields: Mapping.Value[];

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
