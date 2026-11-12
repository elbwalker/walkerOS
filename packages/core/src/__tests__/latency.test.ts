import { latencyBucket } from '../latency';

describe('latencyBucket', () => {
  it.each([
    [0, 0],
    [5, 0],
    [6, 1],
    [10, 1],
    [25, 2],
    [26, 3],
    [1000, 7],
    [2500, 8],
    [10000, 10],
    [10001, 11],
  ])('puts %i ms in bucket %i', (ms, bucket) => {
    expect(latencyBucket(ms)).toBe(bucket);
  });
});
