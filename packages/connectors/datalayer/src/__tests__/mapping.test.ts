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
    expect(gtagToObj(gtag('event'))).toStrictEqual({
      event: undefined,
      data: {},
    });
    expect(gtagToObj(gtag('event', 'foo'))).toStrictEqual({
      event: 'foo',
      data: {},
    });
    expect(gtagToObj(gtag('event', 'foo', { foo: 'bar' }))).toStrictEqual({
      event: 'foo',
      data: { foo: 'bar' },
    });
    expect(gtagToObj(gtag('event', 'foo', { count: 5 }))).toStrictEqual({
      event: 'foo',
      data: { count: 5 },
    });
    expect(
      gtagToObj(gtag('event', 'foo', { foo: 'bar', count: 3 })),
    ).toStrictEqual({
      event: 'foo',
      data: { foo: 'bar', count: 3 },
    });
    expect(gtagToObj(gtag('event', 'foo', 'not-an-object'))).toStrictEqual({
      event: 'foo',
      data: {},
    });
  });

  test('gtagToObj config', () => {
    expect(gtagToObj(gtag('config', 'GA-XXXXXXXXXX'))).toStrictEqual({
      event: 'config GA-XXXXXXXXXX',
      data: {},
    });

    expect(
      gtagToObj(gtag('config', 'GA-XXXXXXXXXX', { send_page_view: false })),
    ).toStrictEqual({
      event: 'config GA-XXXXXXXXXX',
      data: { send_page_view: false },
    });

    expect(
      gtagToObj(gtag('config', 'GA-XXXXXXXXXX', 'non-object')),
    ).toStrictEqual({
      event: 'config GA-XXXXXXXXXX',
      data: {},
    });
  });

  test('gtagToObj consent', () => {
    expect(
      gtagToObj(
        gtag('consent', 'default', {
          ad_storage: true,
          analytics_storage: false,
          wait_for_update: 500,
        }),
      ),
    ).toStrictEqual({
      event: 'consent default',
      data: {
        ad_storage: true,
        analytics_storage: false,
        wait_for_update: 500,
      },
    });

    expect(
      gtagToObj(gtag('consent', 'update', { ad_storage: 'granted' })),
    ).toStrictEqual({
      event: 'consent update',
      data: { ad_storage: true },
    });

    expect(
      gtagToObj(gtag('consent', 'update', { analytics_storage: 'denied' })),
    ).toStrictEqual({
      event: 'consent update',
      data: { analytics_storage: false },
    });

    expect(gtagToObj(gtag('consent', 'update', 'invalid-param'))).toStrictEqual(
      { event: 'consent update', data: {} },
    );
    expect(gtagToObj(gtag('consent', 'update'))).toStrictEqual({
      event: 'consent update',
      data: {},
    });
  });

  test('gtagToObj get', () => {
    expect(gtagToObj(gtag('get', 'campaign'))).toBeUndefined();
  });

  test('gtagToObj set', () => {
    expect(
      gtagToObj(
        gtag('set', 'campaign', {
          id: 'abc',
        }),
      ),
    ).toStrictEqual({
      event: 'set campaign',
      data: { id: 'abc' },
    });

    expect(gtagToObj(gtag('set', { currency: 'USD' }))).toStrictEqual({
      event: undefined,
      data: {},
    });

    expect(gtagToObj(gtag('set', 'user_properties', 'invalid'))).toStrictEqual({
      event: 'set user_properties',
      data: {},
    });
  });

  test('dataLayerToWalkerOS', () => {
    expect(objToEvent({ event: 'e a' })).toStrictEqual({
      event: 'e a',
    });
  });
});
