/**
 * W3C span_id: 8 random bytes encoded as 16 lowercase hex characters.
 * Reference: W3C Trace Context (W3C Recommendation, January 2020).
 */
export function getSpanId(): string {
  let str = '';
  for (let i = 0; i < 16; i++) {
    str += ((Math.random() * 16) | 0).toString(16);
  }
  return str;
}
