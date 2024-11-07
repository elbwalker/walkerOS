import { clone } from '@elbwalker/utils';
import { dataLayerToWalkerOS, gtagToObj } from '../mapping';
import { WalkerOS } from '@elbwalker/types';

describe('mapping', () => {
  function gtag(...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    return clone(arguments as unknown as WalkerOS.AnyObject) || args;
  }

  beforeEach(() => {});

  test('gtagToObj', () => {
    expect(gtagToObj(gtag())).toBeUndefined();
    expect(gtagToObj(gtag('e'))).toBeUndefined();
    expect(gtagToObj(gtag('event'))).toBeUndefined();
    expect(gtagToObj(gtag('event', 'foo'))).toStrictEqual({ event: 'foo' });
  });

  test('dataLayerToWalkerOS', () => {
    expect(dataLayerToWalkerOS({ event: 'e a' })).toStrictEqual({
      event: 'e a',
    });
  });
});
