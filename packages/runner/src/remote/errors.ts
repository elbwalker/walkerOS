/**
 * Reading an error by its shape. Node's fs errors can come from another
 * realm (a test sandbox), where `instanceof Error` is false, so the remote
 * modules read the fields themselves.
 */

import { isRecord } from './json.js';

/** The error's message, else the value as a string. */
export function messageOf(error: unknown): string {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : String(error);
}

/** The error's `code`, such as `ENOENT`, when it has one. */
export function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === 'string'
    ? error.code
    : undefined;
}

/**
 * A fault as a line names it: its code, never its message, which names a
 * path of this instance (and, for a sealed set, the key id).
 */
export function codeOf(error: unknown): string {
  return errorCode(error) ?? 'no error code';
}
