import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationGoogleAds } from '.';

describe('destination Google Ads', () => {
  const w = window;
  let destination: DestinationGoogleAds.Destination,
    config: DestinationGoogleAds.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
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
      mapping: { entity: { action: { custom: { label } } } },
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
    destination.config.mapping = { entity: { action: { custom: { label } } } };
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
      entity: { action: { custom: { label } } },
    };
    elb(event);
    jest.resetAllMocks();

    elb({ event, source: { type: 'dataLayer' } });
    expect(mockFn).toHaveBeenCalledTimes(0);

    elb({ event, source: { type: 'web' } });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('push with value', () => {
    elb('walker destination', destination);
    destination.config.mapping = {
      entity: { action: { custom: { label, value: 'revenue' } } },
    };

    // Missing value property
    elb(event, {});
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
    });

    // Use a default conversion value
    destination.config.custom!.defaultValue = 3.14;
    elb(event, {});
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
      value: 3.14,
    });

    // With value property
    elb(event, { revenue: 42 });
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
      value: 42,
    });
  });

  test('push with transaction_id', () => {
    elb('walker destination', destination);
    const transaction_id = '0rd3r1d';
    destination.config.mapping = {
      entity: { action: { custom: { label, id: 'order_id' } } },
    };

    elb(event, { order_id: transaction_id });
    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'conversion',
      expect.objectContaining({
        send_to: `${conversionId}/${label}`,
        transaction_id,
      }),
    );
  });
});
