import type { WalkerOS } from '.';

export type SendDataValue = WalkerOS.Property | WalkerOS.Properties;
export type SendHeaders = { [key: string]: string };

/**
 * What a transport helper (`sendWeb`, `sendServer`) resolves on success: the
 * response body, parsed as JSON where it parses. A failure throws a
 * `StepError` (code, status, retryable, body) instead.
 */
export interface SendResponse {
  data?: unknown;
}
