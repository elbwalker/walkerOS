import { fullJitterDelay, retryAfterMs } from '../backoff';

describe('fullJitterDelay', () => {
  it.each([
    [1, 1, 60_000],
    [2, 1, 120_000],
    [3, 1, 240_000],
    [4, 1, 300_000],
    [5, 1, 300_000],
    [3, 0, 0],
    [2, 0.5, 60_000],
  ])(
    'after %i failures with random %p waits %i ms',
    (failures, random, expected) => {
      expect(
        fullJitterDelay(failures, {
          baseMs: 30_000,
          capMs: 300_000,
          random: () => random,
        }),
      ).toBe(expected);
    },
  );
});

describe('retryAfterMs', () => {
  const now = Date.parse('Wed, 18 Nov 2026 10:00:00 GMT');

  it.each<[string | null, number | undefined]>([
    ['120', 120_000],
    ['Wed, 18 Nov 2026 10:01:30 GMT', 90_000],
    ['Wed, 18 Nov 2026 09:59:00 GMT', 0],
    ['-1', undefined],
    ['soon', undefined],
    ['', undefined],
    [null, undefined],
  ])('reads %p as %p ms', (header, expected) => {
    expect(retryAfterMs(header, now)).toBe(expected);
  });
});
