import { getEnv } from '../environment';
import type { Env } from '../types/destination';

describe('getEnv', () => {
  it('returns the page window by default', () => {
    expect(getEnv<Env>({}).window).toBe(window);
  });
});
