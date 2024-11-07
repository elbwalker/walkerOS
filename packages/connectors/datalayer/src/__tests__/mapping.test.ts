import { dataLayerToWalkerOS, gtagToObj } from '../mapping';

describe('mapping', () => {
  function gtag(...args: unknown[]) {
    return args;
  }

  beforeEach(() => {});

  test('gtagToObj', () => {
    expect(gtagToObj(gtag('e'))).toBe(void 0);
  });

  test('dataLayerToWalkerOS', () => {
    expect(dataLayerToWalkerOS({ event: 'e a' })).toStrictEqual({
      event: 'e a',
    });
  });
});
