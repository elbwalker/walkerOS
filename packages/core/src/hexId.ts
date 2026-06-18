import { getId } from './getId';

const hexCharset = '0123456789abcdef';

/**
 * Random lowercase-hex id of `length` characters via the CSPRNG-backed getId.
 * Regenerates on the all-zero value, which W3C Trace Context forbids for
 * trace-id and span-id (astronomically rare, but kept spec-correct).
 */
export function hexId(length: number): string {
  let id = getId(length, hexCharset);
  while (/^0+$/.test(id)) id = getId(length, hexCharset);
  return id;
}
