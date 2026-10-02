import { deriveSpanId, getSpanId } from '@walkeros/core';
import type { GA4HitParams } from './types';

/**
 * walkerOS event id for the `index`-th event of a GA4 hit.
 *
 * Shaped like every other walkerOS event id (a W3C span id: 16 lowercase hex
 * characters), but derived from the hit instead of drawn at random, so a
 * re-delivered hit (gtag retry, proxy duplicate) decodes to the same ids and
 * dedup on `event.id` catches it. The hit key is the parent, the event's
 * position the child (the same derivation walkerOS uses for forks):
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

  return deriveSpanId(
    JSON.stringify(['ga4', hit.tid ?? '', hit.cid ?? '', page, seq]),
    index,
  );
}
