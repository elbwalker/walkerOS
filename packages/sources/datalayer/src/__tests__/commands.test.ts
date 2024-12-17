import type { DataLayer } from '../types';
import { sourceDataLayer } from '..';

describe.skip('commands', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);
  let dataLayer: DataLayer;

  const gtag: Gtag.Gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };

  beforeEach(() => {
    window.dataLayer = [];
    dataLayer = window.dataLayer;
  });

  test('consent default', () => {
    sourceDataLayer({ elb });

    gtag('consent', 'default', {
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      ad_storage: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    });

    expect(elb).toHaveBeenCalledTimes(0);
  });

  test('consent update', () => {
    sourceDataLayer({ elb, mapping: { foo: {} } });

    gtag('consent', 'update', {
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      ad_storage: 'denied',
      analytics_storage: 'granted',
      wait_for_update: 500,
    });

    expect(elb).toHaveBeenNthCalledWith(1, 'walker consent', {
      marketing: false,
      analytics: true,
    });
  });

  test('set', () => {
    sourceDataLayer({
      elb,
      mapping: {
        'set campaign': {
          name: 'walker globals',
          command: true,
          custom: {
            data: {
              term: 'term',
            },
          },
        },
      },
    });

    gtag('set', 'campaign', {
      term: 'running+shoes',
    });

    expect(elb).toHaveBeenNthCalledWith(1, 'walker globals', {
      term: 'running+shoes',
    });
  });
});
