import { retryBudget } from '../retryBudget';

describe('retryBudget', () => {
  it('gives a quarter per attempt and two retries with its own wait', () => {
    expect(retryBudget()).toEqual({ attempt: 2500, retries: 2, wait: 1000 });
    expect(retryBudget(4000)).toEqual({ attempt: 1000, retries: 2, wait: 400 });
  });

  it.each([
    // An SDK that waits 1 s, then 2 s: three attempts need 12 s.
    [10_000, 1],
    [12_000, 2],
    [1_500, 0],
  ])('keeps the retries of fixed waits within %i ms', (timeout, retries) => {
    const waits = (count: number) => (1000 * count * (count + 1)) / 2;
    expect(retryBudget(timeout, waits).retries).toBe(retries);
  });

  it('hands the configurable wait to the waits it is given', () => {
    // The first retry waits the configurable wait, the next one 1 s more.
    const waits = (count: number, wait: number) =>
      count && wait + 500 * count * (count - 1);
    expect(retryBudget(10_000, waits)).toEqual({
      attempt: 2500,
      retries: 2,
      wait: 1000,
    });
  });
});
