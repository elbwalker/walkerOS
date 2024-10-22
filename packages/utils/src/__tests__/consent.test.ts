import type { WalkerOS } from '@elbwalker/types';
import { getGrantedConsent } from '../core';

describe('consent', () => {
  test('denied', () => {
    expect(
      getGrantedConsent({ marketing: true }, { functional: true }),
    ).toBeFalsy();
  });

  test('granted by destination', () => {
    expect(
      getGrantedConsent({ functional: true }, { functional: true }),
    ).toStrictEqual({ functional: true });
  });

  test('granted by event', () => {
    expect(
      getGrantedConsent({ functional: true }, { functional: false }, {
        consent: { functional: true },
      } as unknown as WalkerOS.Event),
    ).toStrictEqual({ functional: true });
  });

  test.skip('granted states', () => {
    expect(
      getGrantedConsent({ a: true }, { a: true }, {
        consent: { b: true },
      } as unknown as WalkerOS.Event),
    ).toStrictEqual({ a: true, b: true });
  });
});
