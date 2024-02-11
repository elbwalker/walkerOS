import webClient, { type WebClient } from '@elbwalker/walker.js';
import type { Config, Function } from './types';

describe('destination Google Ads', () => {
  const w = window;
  let walkerjs: WebClient.Instance, destination: Function, config: Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const conversionId = 'AW-123456789';
  const label = 'abc';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    config = {
      custom: { conversionId },
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    destination = require('.').default;
    destination.config = config;

    w.elbLayer = [];
    w.dataLayer = [];
    w.gtag = mockFn;

    walkerjs = webClient({ pageview: false });
    walkerjs.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    (w.dataLayer as unknown) = undefined;
    (w.gtag as unknown) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    walkerjs.push('walker destination', destination);

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    walkerjs.push(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();
  });

  test('Init calls', () => {
    walkerjs.push('walker destination', destination);

    walkerjs.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', conversionId);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    walkerjs.push('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${conversionId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    walkerjs.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('push', () => {
    // Missing mapping
    walkerjs.push('walker destination', destination);
    walkerjs.push(event);
    expect(mockFn).not.toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
    });

    // Correct mapping
    destination.config.mapping = { entity: { action: { custom: { label } } } };
    walkerjs.push(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
    });

    // Change currency
    const currency = 'USD';
    destination.config.custom!.currency = currency;

    walkerjs.push(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency,
    });
  });

  test('push with value', () => {
    walkerjs.push('walker destination', destination);
    destination.config.mapping = {
      entity: { action: { custom: { label, value: 'revenue' } } },
    };

    // Missing value property
    walkerjs.push(event, {});
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
    });

    // Use a default conversion value
    destination.config.custom!.defaultValue = 3.14;
    walkerjs.push(event, {});
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
      value: 3.14,
    });

    // With value property
    walkerjs.push(event, { revenue: 42 });
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
      value: 42,
    });
  });

  test('push with transaction_id', () => {
    walkerjs.push('walker destination', destination);
    const transaction_id = '0rd3r1d';
    destination.config.mapping = {
      entity: { action: { custom: { label, id: 'order_id' } } },
    };

    walkerjs.push(event, { order_id: transaction_id });
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
