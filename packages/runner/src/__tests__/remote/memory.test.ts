import { redactLine } from '@walkeros/core';
import { childHeapMb, grantedMemoryBytes } from '../../remote/memory.js';
import type { HeapFacts } from '../../remote/lines.js';

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

describe('childHeapMb', () => {
  it.each<[string, Parameters<typeof childHeapMb>[0], HeapFacts]>([
    [
      '512 MiB granted with 60 MiB resident',
      { grantedBytes: 512 * MIB, supervisorRssBytes: 60 * MIB },
      { heapMb: 324, from: 'granted', grantedMb: 512, supervisorMb: 60 },
    ],
    [
      '2 GiB granted with 70 MiB resident',
      { grantedBytes: 2 * GIB, supervisorRssBytes: 70 * MIB },
      { heapMb: 1466, from: 'granted', grantedMb: 2048, supervisorMb: 70 },
    ],
    [
      'a flag of 200',
      { grantedBytes: 128 * MIB, supervisorRssBytes: 60 * MIB, flagMb: 200 },
      { heapMb: 200, from: 'flag' },
    ],
  ])('sizes the heap for %s', (_case, input, heap) => {
    expect(childHeapMb(input)).toEqual(heap);
  });

  it.each<[string, Parameters<typeof childHeapMb>[0], string]>([
    [
      'a flag of 63',
      { grantedBytes: 2 * GIB, supervisorRssBytes: 60 * MIB, flagMb: 63 },
      'Heap 63 MB for the flow, from --heap, is below the 64 MB minimum',
    ],
    [
      '128 MiB granted with 60 MiB resident',
      { grantedBytes: 128 * MIB, supervisorRssBytes: 60 * MIB },
      'Heap 36 MB for the flow is below the 64 MB minimum: three quarters of 128 MB granted, less 60 MB for the supervisor',
    ],
  ])('throws for %s, in a line the redactor keeps', (_case, input, message) => {
    expect(() => childHeapMb(input)).toThrow(new Error(message));
    expect(redactLine(message)).toBe(message);
  });
});

describe('grantedMemoryBytes', () => {
  it.each<[string, number, number, number]>([
    ['no constraint gives the total', 0, 8 * GIB, 8 * GIB],
    ['a constraint at the total gives the total', 8 * GIB, 8 * GIB, 8 * GIB],
    ['a constraint above the total gives the total', 2 ** 63, 8 * GIB, 8 * GIB],
    ['a constraint under the total gives it', 512 * MIB, 8 * GIB, 512 * MIB],
  ])('%s', (_case, constrained, total, granted) => {
    expect(
      grantedMemoryBytes({
        constrained: () => constrained,
        total: () => total,
      }),
    ).toBe(granted);
  });

  it('reads this process when no reader is given', () => {
    expect(grantedMemoryBytes()).toBeGreaterThan(0);
  });
});
