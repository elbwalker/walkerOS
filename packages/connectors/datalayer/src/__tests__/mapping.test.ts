import type { WalkerOS } from '@elbwalker/types';
import { clone } from '@elbwalker/utils';
import { gtagToObj, objToEvent } from '../mapping';

describe('mapping', () => {
  function gtag(...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    return clone(arguments as unknown as WalkerOS.AnyObject) || args;
  }

  beforeEach(() => {});

  test('gtagToObj no arguments', () => {
    expect(gtagToObj(gtag())).toBeUndefined();
    expect(gtagToObj(gtag('e'))).toBeUndefined();
  });

  test('gtagToObj event', () => {
    expect(gtagToObj(gtag('event'))).toStrictEqual({ event: undefined });
    expect(gtagToObj(gtag('event', 'foo'))).toStrictEqual({ event: 'foo' });
    expect(gtagToObj(gtag('event', 'foo', { foo: 'bar' }))).toStrictEqual({
      event: 'foo',
      foo: 'bar',
    });
    expect(gtagToObj(gtag('event', 'foo', { count: 5 }))).toStrictEqual({
      event: 'foo',
      count: 5,
    });
    expect(
      gtagToObj(gtag('event', 'foo', { foo: 'bar', count: 3 })),
    ).toStrictEqual({
      event: 'foo',
      foo: 'bar',
      count: 3,
    });
    expect(gtagToObj(gtag('event', 'foo', 'not-an-object'))).toStrictEqual({
      event: 'foo',
    });
  });

  test.skip('gtagToObj consent', () => {
    expect(
      gtagToObj(gtag('consent', 'update', { ad_storage: 'granted' })),
    ).toStrictEqual({
      event: 'consent',
      consentArg: 'update',
      consentParams: { ad_storage: 'granted' },
    });

    expect(
      gtagToObj(gtag('consent', 'update', { analytics_storage: 'denied' })),
    ).toStrictEqual({
      event: 'consent',
      consentArg: 'update',
      consentParams: { analytics_storage: 'denied' },
    });

    // Invalid consent params, should return undefined or handle gracefully
    expect(
      gtagToObj(gtag('consent', 'update', 'invalid-param')),
    ).toBeUndefined();
    expect(gtagToObj(gtag('consent', 'update'))).toBeUndefined();
  });

  test.skip('gtagToObj config', () => {
    expect(
      gtagToObj(gtag('config', 'GA_MEASUREMENT_ID', { page_path: '/home' })),
    ).toStrictEqual({
      event: 'config',
      targetId: 'GA_MEASUREMENT_ID',
      params: { page_path: '/home' },
    });

    expect(gtagToObj(gtag('config', 'GA_MEASUREMENT_ID'))).toStrictEqual({
      event: 'config',
      targetId: 'GA_MEASUREMENT_ID',
    });

    // Invalid config with non-object params
    expect(
      gtagToObj(gtag('config', 'GA_MEASUREMENT_ID', 'non-object')),
    ).toStrictEqual({
      event: 'config',
      targetId: 'GA_MEASUREMENT_ID',
    });
  });

  test.skip('gtagToObj set', () => {
    expect(
      gtagToObj(gtag('set', 'user_properties', { favorite_color: 'blue' })),
    ).toStrictEqual({
      event: 'set',
      targetId: 'user_properties',
      params: { favorite_color: 'blue' },
    });

    expect(gtagToObj(gtag('set', { currency: 'USD' }))).toStrictEqual({
      event: 'set',
      params: { currency: 'USD' },
    });

    // Invalid set command with non-object params
    expect(gtagToObj(gtag('set', 'user_properties', 'invalid'))).toStrictEqual({
      event: 'set',
      targetId: 'user_properties',
    });
  });

  test('dataLayerToWalkerOS', () => {
    expect(objToEvent({ event: 'e a' })).toStrictEqual({
      event: 'e a',
    });
  });
});
