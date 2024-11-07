import type { WalkerOS } from '@elbwalker/types';
import { clone } from '@elbwalker/utils';
import { objToWalkerOS, gtagToObj } from '../mapping';

describe('mapping', () => {
  function gtag(...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    return clone(arguments as unknown as WalkerOS.AnyObject) || args;
  }

  beforeEach(() => {});

  test('gtagToObj', () => {
    expect(gtagToObj(gtag())).toBeUndefined();
    expect(gtagToObj(gtag('e'))).toBeUndefined();
    expect(gtagToObj(gtag('event'))).toStrictEqual({ event: undefined });
    expect(gtagToObj(gtag('event', 'foo'))).toStrictEqual({ event: 'foo' });
  });

  test('dataLayerToWalkerOS', () => {
    expect(objToWalkerOS({ event: 'e a' })).toStrictEqual({
      event: 'e a',
    });
  });
});
