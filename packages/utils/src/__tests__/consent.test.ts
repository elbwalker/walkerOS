import { getGrantedConsent } from '../core';

describe('consent', () => {
  test('denied', () => {
    expect(
      getGrantedConsent(
        { marketing: true },
        { functional: true, marketing: false },
      ),
    ).toBeFalsy();
  });

  test('granted by destination', () => {
    expect(
      getGrantedConsent({ functional: true }, { functional: true }),
    ).toStrictEqual({ functional: true });
  });

  test('granted individually', () => {
    expect(
      getGrantedConsent(
        { marketing: true },
        { marketing: false },
        { marketing: true },
      ),
    ).toStrictEqual({ marketing: true });
  });

  test('granted states', () => {
    expect(
      getGrantedConsent({ foo: true }, { foo: true }, { bar: true }),
    ).toStrictEqual({ foo: true, bar: true });
  });
});
