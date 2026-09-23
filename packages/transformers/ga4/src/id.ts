import { getSpanId } from '@walkeros/core';
import type { GA4HitParams } from './types';

const FNV64_OFFSET = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

/**
 * FNV-1a 64-bit over the UTF-16 code units of `input`, as 16 lowercase hex
 * characters. Deterministic and platform independent.
 */
function fnv1a64(input: string): string {
  let hash = FNV64_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV64_PRIME) & MASK64;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * walkerOS event id for the `index`-th event of a GA4 hit.
 *
 * Shaped like every other walkerOS event id (a W3C span id: 16 lowercase hex
 * characters), but derived from the hit instead of drawn at random, so a
 * re-delivered hit (gtag retry, proxy duplicate) decodes to the same ids and
 * dedup on `event.id` catches it:
 *
 *   - `_p`   page load id, shared by every hit of one page load
 *   - `_s`   hit sequence counter within that page load
 *   - index  position of the event inside the hit (batched POST)
 *   - `tid`  and `cid` separate two properties on one page and page load
 *            ids that happen to collide across devices
 *
 * Without `_p` or `_s` there is no stable per-hit key, so the id falls back
 * to a random span id: dedup then never drops such an event by mistake.
 */
export function getEventId(hit: GA4HitParams, index: number): string {
  const { _p: page, _s: seq } = hit;
  if (!page || !seq) return getSpanId();

  const id = fnv1a64(
    JSON.stringify(['ga4', hit.tid ?? '', hit.cid ?? '', page, seq, index]),
  );
  // W3C forbids the all-zero span id.
  return /^0+$/.test(id) ? fnv1a64(JSON.stringify([id, index])) : id;
}
