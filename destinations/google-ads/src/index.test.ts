import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationAds } from '.';

describe('destination Google Ads', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationAds.Function,
    config: DestinationAds.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const conversionId = 'AW-123456789';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    config = {
      custom: { conversionId },
    };

    destination = require('.').default;
    destination.config = config;

    w.elbLayer = [];
    w.dataLayer = [];
    w.gtag = mockFn;

    elbwalker = Elbwalker();
    elbwalker.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    (w.dataLayer as any) = undefined;
    (w.gtag as any) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elbwalker.push('walker destination', destination);

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elbwalker.push(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();
  });

  test('Init calls', () => {
    elbwalker.push('walker destination', destination);

    elbwalker.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', conversionId);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${conversionId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('push', () => {
    const label = 'abc';

    elbwalker.push('walker destination', destination);
    elbwalker.push(event);
    expect(mockFn).not.toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
    });

    destination.config.mapping = {
      entity: { action: { label } },
    };

    elbwalker.push(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency: 'EUR',
    });

    // Change currency
    const currency = 'USD';
    destination.config.custom.currency = currency;

    elbwalker.push(event);
    expect(mockFn).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${conversionId}/${label}`,
      currency,
    });
  });

  test.skip('mapping value', () => {});
});
