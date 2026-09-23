import { deriveSpanId, fnv1a64 } from '../deriveSpanId';
import * as packageIndex from '../index';

describe('fnv1a64', () => {
  // Reference vectors of FNV-1a 64 (a BigInt implementation must match).
  it.each([
    ['', 'cbf29ce484222325'],
    ['a', 'af63dc4c8601ec8c'],
    ['foobar', '85944171f73967e8'],
    ['€漢字😀', 'd3ccba1ab8bc65b1'],
  ])('hashes %j to %s', (input, expected) => {
    expect(fnv1a64(input)).toBe(expected);
  });
});

describe('deriveSpanId', () => {
  const parent = '0123456789abcdef';

  it('returns 16 lowercase hex characters', () => {
    expect(deriveSpanId(parent, 0)).toMatch(/^[0-9a-f]{16}$/);
  });

  it.each<[number | string, string]>([
    [0, '262b15209a45af01'],
    [1, '262dd1209a47714c'],
    ['b', 'fd3ae60126682cb3'],
  ])('is fixed for (parent, %j)', (position, expected) => {
    expect(deriveSpanId(parent, position)).toBe(expected);
  });

  it('is deterministic', () => {
    expect(deriveSpanId(parent, 2)).toBe(deriveSpanId(parent, 2));
  });

  it('differs per position, position type and parent', () => {
    const ids = new Set([
      deriveSpanId(parent, 0),
      deriveSpanId(parent, 1),
      deriveSpanId(parent, '1'),
      deriveSpanId('fedcba9876543210', 0),
    ]);
    expect(ids.size).toBe(4);
  });

  it('is exported from the package index', () => {
    expect(packageIndex.deriveSpanId).toBe(deriveSpanId);
  });
});
