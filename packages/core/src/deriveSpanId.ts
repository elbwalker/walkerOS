/**
 * FNV-1a 64-bit over the UTF-16 code units of `input`, as 16 lowercase hex
 * characters. Computed on four 16-bit limbs so it runs on ES2018 engines
 * (no BigInt). FNV prime 2^40 + 0x1b3.
 */
export function fnv1a64(input: string): string {
  // Offset basis 0xcbf29ce484222325, lowest limb first.
  let v0 = 0x2325;
  let v1 = 0x8422;
  let v2 = 0x9ce4;
  let v3 = 0xcbf2;
  for (let i = 0; i < input.length; i++) {
    v0 ^= input.charCodeAt(i);
    // hash * (2^40 + 0x1b3) mod 2^64
    const t0 = v0 * 0x1b3;
    let t1 = v1 * 0x1b3;
    let t2 = v2 * 0x1b3;
    let t3 = v3 * 0x1b3;
    t2 += v0 << 8;
    t3 += v1 << 8;
    t1 += t0 >>> 16;
    v0 = t0 & 0xffff;
    t2 += t1 >>> 16;
    v1 = t1 & 0xffff;
    v3 = (t3 + (t2 >>> 16)) & 0xffff;
    v2 = t2 & 0xffff;
  }
  const hex = (limb: number) => limb.toString(16).padStart(4, '0');
  return hex(v3) + hex(v2) + hex(v1) + hex(v0);
}

/**
 * Deterministic child span id: 16 lowercase hex characters (the shape of
 * `getSpanId`), derived from the parent id and the child's position. The
 * same inputs always give the same id, different positions or parents give
 * different ids, so forks of one event never collapse on `event.id`.
 */
export function deriveSpanId(
  parentId: string,
  position: number | string,
): string {
  const id = fnv1a64(JSON.stringify([parentId, position]));
  // W3C forbids the all-zero span id.
  return /^0+$/.test(id) ? fnv1a64(JSON.stringify([id, position])) : id;
}
