import { hexId } from './hexId';

/**
 * W3C span_id: 8 random bytes encoded as 16 lowercase hex characters.
 * Reference: W3C Trace Context (W3C Recommendation, January 2020).
 */
export function getSpanId(): string {
  return hexId(16);
}
