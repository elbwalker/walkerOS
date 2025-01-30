import type { DataLayer } from '../types';
import { sourceDataLayer } from '..';
import { WalkerOS } from '@elbwalker/types';

describe('consent', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);
  let dataLayer: DataLayer;

  const gtag: Gtag.Gtag & WalkerOS.AnyFunction = function () {
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
    sourceDataLayer({ elb });

    gtag('consent', 'update', {
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      ad_storage: 'denied',
      analytics_storage: 'granted',
      wait_for_update: 500,
    });

    expect(elb).toHaveBeenCalledWith('walker consent', {
      marketing: false,
      analytics: true,
    });

    gtag('consent', 'update', { analytics_storage: 'granted' });
    expect(elb).toHaveBeenLastCalledWith('walker consent', {
      analytics: true,
    });

    gtag('consent', 'update', { ad_storage: 'denied' });
    expect(elb).toHaveBeenLastCalledWith('walker consent', {
      marketing: false,
    });

    jest.clearAllMocks();
    gtag('consent', 'update', 'invalid-param');
    expect(elb).toHaveBeenLastCalledWith('walker consent', {});

    gtag('consent', 'update');
    expect(elb).toHaveBeenLastCalledWith('walker consent', {});

    gtag('consent');
    expect(elb).toHaveBeenLastCalledWith('walker consent', {});
  });
});
