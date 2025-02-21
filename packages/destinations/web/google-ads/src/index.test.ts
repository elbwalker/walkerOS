import type { DestinationGoogleAds } from '.';
import { elb, Walkerjs } from '@elbwalker/walker.js';
import { getEvent } from '@elbwalker/utils';
import { events, mapping } from '../examples';

describe('destination Google Ads', () => {
  const w = window;
  let destination: DestinationGoogleAds.Destination,
    config: DestinationGoogleAds.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent('order complete');
  const conversionId = 'AW-123456789';
  const label = 'abc';

  beforeEach(() => {
    config = {
      custom: { conversionId },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    w.gtag = mockFn;

    Walkerjs({ pageview: false, run: true, session: false });
  });

  afterEach(() => {});

  test('init', () => {
    (w.dataLayer as unknown) = undefined;
    (w.gtag as unknown) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elb('walker destination', destination);

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elb(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();
  });

  test('fn', () => {
    (w.gtag as unknown) = undefined;
    const fn = jest.fn();
    elb('walker destination', destination, {
      ...config,
      mapping: { order: { complete: { name: 'label' } } },
      fn,
    });
    elb(event);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('Init calls', () => {
    elb('walker destination', destination);

    elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', conversionId);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${conversionId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('push', () => {
    // Missing mapping
    elb('walker destination', destination);
    elb(event);
    expect(mockFn).not.toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
    });

    // Correct mapping
    destination.config.mapping = {
      order: { complete: { name: label } },
    };
    elb(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
    });

    // Change currency
    const currency = 'USD';
    destination.config.custom!.currency = currency;

    elb(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency,
    });
  });

  test('dataLayer source', () => {
    elb('walker destination', destination);
    destination.config.mapping = {
      order: { complete: { name: label } },
    };
    elb(event);
    jest.resetAllMocks();
    event.source.type = 'dataLayer';
    elb(event);
    expect(mockFn).toHaveBeenCalledTimes(0);

    event.source.type = 'web';
    elb(event);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('event conversion', () => {
    elb('walker destination', destination, {
      custom: { conversionId },
      mapping: mapping.config,
    });

    elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.conversion());
  });

  test('push with value', () => {
    elb('walker destination', destination);
    destination.config.mapping = {
      order: {
        complete: {
          name: label,
          data: { map: { value: 'data.total' } },
        },
      },
    };

    // With value property
    elb(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
      value: event.data.total,
    });

    // Missing value property
    delete event.data.total;
    elb(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
    });
  });

  test('push with transaction_id', () => {
    elb('walker destination', destination);
    destination.config.mapping = {
      order: {
        complete: {
          name: label,
          data: { map: { transaction_id: 'data.id' } },
        },
      },
    };

    elb(event);
    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'conversion',
      expect.objectContaining({
        send_to: `${conversionId}/${label}`,
        transaction_id: event.data.id,
      }),
    );
  });
});
